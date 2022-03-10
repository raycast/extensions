import { ISpeedTestDownload, ISpeedTestPing, ISpeedTestResult, ISpeedTestStart, ISpeedTestUpload } from './types'

const megabit = 125000
const PROGRESS_AMOUNT = 12
const PROGRESS_PREFIX_FILL = '︎▪︎'
const PROGRESS_PLACEHOLDER = '▫︎'
const IP_PLACEHOLDER = '0.0.0.0'
export default (
  testStart?: ISpeedTestStart,
  ping?: ISpeedTestPing,
  download?: ISpeedTestDownload,
  upload?: ISpeedTestUpload,
  result?: ISpeedTestResult
) => {
  const downloadProgressUI = Array(PROGRESS_AMOUNT).fill(PROGRESS_PLACEHOLDER)
  if (download) {
    const progressNumber = Math.floor(download.download.progress * (PROGRESS_AMOUNT - 1))

    for (let i = 0; i <= progressNumber; i++) {
      downloadProgressUI[i] = PROGRESS_PREFIX_FILL
    }
  }

  const uploadProgressUI = Array(PROGRESS_AMOUNT).fill(PROGRESS_PLACEHOLDER)
  if (upload) {
    const progressNumber = Math.floor(upload.upload.progress * (PROGRESS_AMOUNT - 1))

    for (let i = 0; i <= progressNumber; i++) {
      uploadProgressUI[i] = PROGRESS_PREFIX_FILL
    }
  }

  let ISPInfo = 'Unknown'
  if (testStart?.isp && testStart?.server) {
    ISPInfo = `${testStart?.isp} -> ${testStart?.server.name} (${testStart?.server.location})`
  }

  return `
### Connection

📶 Ping: ${ping?.ping.latency || 0}ms

🧑‍💻 You IP: ${testStart?.interface.externalIp || IP_PLACEHOLDER}

📡 ISP: ${ISPInfo}

### Download
⏬ Speed: **${((download?.download.bandwidth || 0) / megabit).toFixed(2)}**/Mbps

Progress: [ ${downloadProgressUI.join('')} ]

### Upload

⏫ Speed: **${((upload?.upload.bandwidth || 0) / megabit).toFixed(2)}**/Mbps

Progress: [ ${uploadProgressUI.join('')} ]
>>>
---
**Interface**

Name: ${testStart?.interface.name}
 
Local IP: ${testStart?.interface.internalIp || IP_PLACEHOLDER}

Mac Address: ${testStart?.interface.macAddr || ':::::'}
>>>
**Server**

IP: ${testStart?.server.ip || IP_PLACEHOLDER}

Country: ${testStart?.server.country || '🌍'}

Host: ${testStart?.server.host || '🛰'}
>>>
Date: ${testStart?.timestamp || '⏰'}

Report ID: ${result?.result.id ? result?.result.id : 'Report not created'}
>>>
---
## About

Speedtest by Ookla 
`
}
