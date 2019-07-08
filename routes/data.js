const router = require('express').Router();
const fs = require('fs');
const { promisify } = require('util');
const path = require('path');

const { getLogEntries } = require('../utils/dataUtils');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// route: POST /data
// desc: posting new array of requests
router.post('/', async (req, res) => {
  const dataRaw = await readFile(path.resolve(__dirname, '..', 'averagedLogs.json'));
  const data = JSON.parse(dataRaw);
  const logs = getLogEntries(req.body);
  
  // Writing new entries to a file
  logs.forEach((elem) => {
    if (data[elem.url]) {
      if (data[elem.url].logs && data[elem.url].logs.length >= 5) {
        data[elem.url].logs.shift();
        data[elem.url].logs.push({ "tsStart": elem.tsStart, "tsEnd": elem.tsEnd, "avgDelay": elem.avgDelay });
      } else if (data[elem.url].logs) {
        data[elem.url].logs.push({ "tsStart": elem.tsStart, "tsEnd": elem.tsEnd, "avgDelay": elem.avgDelay });
      }
    } else {
      data[elem.url] = { "logs": [{ "tsStart": elem.tsStart, "tsEnd": elem.tsEnd, "avgDelay": elem.avgDelay }] };
    }
  });

  // Calculating average delay for each URL
  Object.entries(data).forEach(([url, urlData]) => {
    const avgDelay = urlData.logs.reduce((acc, value) => { return acc + value.avgDelay }, 0) / urlData.logs.length;
    data[url].avgDelay = avgDelay;
  });

  // Finding min and max delay for each URL
  Object.entries(data).forEach(([url, urlData]) => {
    const delays = [];
    urlData.logs.forEach(log => delays.push(log.avgDelay));
    data[url].minBatchDelay = Math.min(...delays);
    data[url].maxBatchDelay = Math.max(...delays);
  });

  await writeFile(path.resolve(__dirname, '..', 'averagedLogs.json'), JSON.stringify(data));
  res.json({ msg: 'Logs uploaded' });
});

router.get('/', async (req, res) => {
  const dataRaw = await readFile(path.resolve(__dirname, '..', 'averagedLogs.json'));
  const data = JSON.parse(dataRaw);
  const dataToSend = Object.entries(data).reduce((acc, [url, urlData]) => {
    return ([
    ...acc, {
    url,
    avgDelay: urlData.avgDelay,
    maxBatchDelay: urlData.maxBatchDelay,
    minBatchDelay: urlData.minBatchDelay,
    tsEnd: urlData.logs[urlData.logs.length - 1].tsEnd,
    tsStart: urlData.logs[0].tsStart,
  }])}, []);
  res.json(dataToSend);
});

module.exports = router;
