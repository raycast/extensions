import { Color, Icon, Image, LocalStorage } from '@raycast/api'
import { testBackendConnect } from '../api'
import request from '../api/request'
import { BackendsT, ConnectorTrafficT, DevicesT, RequestItemT, SystemT, TrafficResponseT } from './types'

const IconIsCurrent = (condition: boolean) => ({
  source: condition ? Icon.Checkmark : 'Transparent.png',
  tintColor: Color.Green,
})

const IconIsSelected = (condition: boolean) => ({
  source: condition ? Icon.Checkmark : Icon.Circle,
  tintColor: condition ? Color.Green : Color.PrimaryText,
})

const IconEvent = (type: number) => ({
  source: Icon.Dot,
  tintColor: type === 0 ? Color.Green : type === 1 ? Color.Yellow : Color.Red,
})

const IconRequest = (completed: number, failed: number) => ({
  source: !completed ? Icon.Circle : failed ? Icon.XmarkCircle : Icon.Checkmark,
  tintColor: !completed ? Color.Yellow : failed ? Color.Red : Color.Green,
})

const getBackends = async (): Promise<BackendsT> => {
  const items = await LocalStorage.allItems()
  Object.entries(items).forEach(([key, value]) => {
    const [url, xKey] = value.split('@')
    items[key] = { url, xKey }
  })
  ;['current', 'system'].forEach((key) => delete items[key])
  return items
}

const getCurrentBackend = async () => {
  const currentBackendName = await getCurrentBackendName()
  const backends = await getBackends()
  const currentBackend = backends[currentBackendName as string]
  return currentBackend
}

const getCurrentBackendName = async () => {
  const backend: string | undefined = await LocalStorage.getItem('current')
  return backend
}

const getCurrentBackendVersion = async () => {
  const {
    data: { deviceName },
    headers,
  } = await request({
    method: 'get',
    url: '/environment',
  })
  await LocalStorage.setItem('system', headers['x-system'])
  return {
    deviceName,
    version: `${headers['x-system']} ${headers['x-surge-version']}(${headers['x-surge-build']})`,
  }
}

const checkSystemIsIOS = async () => {
  const system = await LocalStorage.getItem<SystemT>('system')
  return system === 'iOS'
}

const checkBackendStatus = async (): Promise<[boolean, string, string]> => {
  const backends = Object.keys(await getBackends())
  if (backends.length === 0) {
    return [false, 'No available backend', 'Configure in Backends']
  }
  const status = await testBackendConnect()
  if (!status) {
    return [false, 'Backend connection failed', `Please check your 'Backends' setting`]
  }
  return [true, '', '']
}

const setCurrentBackendName = async (name: string) => {
  await LocalStorage.setItem('current', name)
}

const getGroupTypeByDetail = (detail: string) => {
  if (detail.includes('select')) return 'SELECT'
  if (detail.includes('url-test')) return 'URL TEST'
  if (detail.includes('fallback')) return 'FALLBACK'
  if (detail.includes('ssid')) return 'SSID'
  if (detail.includes('subnet')) return 'SUBNET'
  return ''
}

const getEventTypeByNum = (Num: number) => {
  if (Num === 2) return 'ERROR'
  if (Num === 1) return 'WARN'
  return 'INFO'
}

const getSortedTraffic = (
  connector: TrafficResponseT['connector'],
): Array<ConnectorTrafficT & { name: string }> =>
  Object.entries({ ...connector })
    .map(([name, value]) => ({
      name,
      ...value,
    }))
    .sort((a, b) => b.in + b.out - (a.in + a.out))

const getNameByPath = (path: string) => {
  const i = path.lastIndexOf('/')
  return path.substring(i + 1)
}

const getProcessData = (
  { pid, processPath, remoteClientPhysicalAddress }: RequestItemT,
  deviceList: DevicesT,
  url: string,
) => {
  const data: { title: string; text: string; icon: Image.ImageLike | undefined } = {
    title: 'Process',
    text: 'N/A',
    icon: undefined,
  }
  if (remoteClientPhysicalAddress) {
    const device = deviceList.find((device) => device.physicalAddress === remoteClientPhysicalAddress)
    if (device) {
      data.title = 'Remote Client'
      data.text = device.name
      data.icon = {
        source: `${url}/resources/devices-icon?id=${encodeURIComponent(device.dhcpIcon)}`,
      }
    }
  } else if (processPath) {
    const name = getNameByPath(processPath)
    data.text = `${name}(${pid})`
  }
  return data
}

const getRequestStatus = ({ completed, failed, replica, modified }: RequestItemT) => {
  if (!completed) return 'Active'
  else if (failed) return 'Failed'
  else if (modified || replica) return 'Modified'
  return 'Completed'
}

export {
  getBackends,
  getCurrentBackendName,
  setCurrentBackendName,
  getCurrentBackend,
  getCurrentBackendVersion,
  checkBackendStatus,
  getGroupTypeByDetail,
  getEventTypeByNum,
  getSortedTraffic,
  IconIsSelected,
  IconIsCurrent,
  IconRequest,
  IconEvent,
  checkSystemIsIOS,
  getNameByPath,
  getProcessData,
  getRequestStatus,
}
