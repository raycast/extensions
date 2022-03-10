export interface ISpeedTestBasic {
  type: SpeedTestDataType
  timestamp: string
}

export interface ISpeedLog extends ISpeedTestBasic {
  message: string
  level: string
}

export interface ISpeedTestStart extends ISpeedTestBasic {
  isp: string
  interface: ISpeedTestDataInterface
  server: ISpeedTestDataServer
}

export interface ISpeedTestPing extends ISpeedTestBasic {
  ping: ISpeedTestDataPing
}

export interface ISpeedTestUpload extends ISpeedTestBasic {
  upload: ISpeedTestDataUploadAndDownload
}

export interface ISpeedTestDownload extends ISpeedTestBasic {
  download: ISpeedTestDataUploadAndDownload
}

export interface ISpeedTestResult extends ISpeedTestBasic {
  result: ISpeedTestDataResult
}

export interface ISpeedTestDataResult {
  id: number
  url: string
  persisted: boolean
}

export interface ISpeedTestDataUploadAndDownload {
  bytes: number
  elapsed: number
  progress: number
  bandwidth: number
  progressUI?: string
}

export interface ISpeedTestDataPing {
  jitter: number
  latency: number
  progress: number
}

export interface ISpeedTestDataInterface {
  name: string
  isVpn: boolean
  macAddr: string
  internalIp: string
  externalIp: string
}

export interface ISpeedTestDataServer {
  id: number
  ip: string
  host: string
  port: number
  name: string
  country: string
  location: string
}
// order by order
export enum SpeedTestDataType {
  testStart = 'testStart',
  Ping = 'ping',
  Download = 'download',
  Upload = 'upload',
  result = 'result',
}
