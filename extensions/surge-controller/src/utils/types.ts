import { AxiosResponse } from 'axios'

export type ApiLoaderType = <T, P = undefined>(params?: P) => Promise<AxiosResponse<T>>
export type ApiLoaderCustomType<T> = () => Promise<CustomResponseT<T>>
export type CustomResponseT<T> = {
  data: T
}

export type SystemT = 'macOS' | 'iOS'
export type VersionT = {
  deviceName: string
  version: string
}

export type BackendT = {
  url: string
  xKey: string
}

export type BackendsT = Record<string, BackendT>

export type BackendFormT = BackendT & {
  name: string
}

export type DNSListT = {
  timeCost: number
  path: string
  data: string[]
  domain: string
  server: string
  expiresTime: number
}[]

export type FeatureResponseT = {
  enabled: boolean
}

export type CapabilityListT = {
  title: string
  status: boolean
}[]

export type ModuleResponseT = {
  available: string[]
  enabled: string[]
}

export type ModuleListT = {
  name: string
  status: boolean
}[]

export type OutboundModeNameT = 'direct' | 'proxy' | 'rule'

export type OutboundModeResponseT = {
  mode: OutboundModeNameT
}

export type ProfileT = {
  profiles: string[]
}

export type CurrentProfileT = {
  name: string
  profile: string
}

export type TrafficT = (ConnectorTrafficT & { name: string })[]

export interface ConnectorTrafficT {
  outCurrentSpeed: number
  in: number
  inCurrentSpeed: number
  outMaxSpeed: number
  out: number
  inMaxSpeed: number
}

export type TrafficResponseT = {
  startTime: number
  interface: {
    [name: string]: ConnectorTrafficT
  }
  connector: {
    [name: string]: ConnectorTrafficT
  }
}

export type ProxiesT = {
  isGroup: number
  name: string
  typeDescription: string
  lineHash: string
}[]

export type PolicyGroupResponseT = {
  [key: string]: ProxiesT
}

export type PolicyGroupSelectResponseT = {
  policy: string
}

export type PoliciesResponseT = {
  proxies: string[]
  'policy-groups': string[]
}

export type PolicyGroupDetailResponseT = {
  [key: string]: string
}

export type PoliciesT = {
  name: string
  type: string
  proxies: ProxiesT
  select: string
}[]

export type BenchmarkT = {
  [key: string]: {
    lastTestErrorMessage: string | null
    lastTestScoreInMS: number
    testing: number
    lastTestDate: number
  }
}

export type DevicesDHCPT = {
  assignedIP?: string
  currentIP?: string
  dhcpHostname: string
  dhcpLastSeen?: string
  handledBySurge: 0 | 1
  displayName?: string
  icon?: string
  physicalAddress: string
  shouldHandledBySurge: 0 | 1
  waitingToReconnect: 0 | 1
}

export type DevicesBytesStatT = {
  h6: number
  h12: number
  h24: number
  m5: number
  m15: number
  m60: number
  today: number
}

export type DevicesT = {
  activeConnections: number
  currentInSpeed: number
  currentOutSpeed: number
  currentSpeed: number
  dhcpAssignedIP?: string
  dhcpGatewayEnabled: number
  dhcpIcon: string
  dhcpLastIP: string
  dhcpLastSeenTimestamp?: number
  dhcpWaitingToReconnect: number
  dhcpHostname?: string
  displayIPAddress: string
  hasProxyConnection: number
  hasTCPConnection: number
  identifier: string
  inBytes: number
  outBytes: number
  inBytesStat?: DevicesBytesStatT
  outBytesStat?: DevicesBytesStatT
  totalBytes: number
  totalConnections: number
  name: string
  physicalAddress: string
  sourceIP: string
  vendor: string
  dhcpDevice?: DevicesDHCPT
}[]

export type DevciesParamsT = { name: string; address: string; shouldHandledBySurge: boolean }

export type EventsT = {
  identifier: string
  date: string
  type: number
  allowDismiss: number
  content: string
}[]

export type RequestItemT = {
  id: number
  remoteAddress?: string
  inMaxSpeed: number
  proxyMode: 1 | 0
  interface?: string
  notes?: string[]
  inCurrentSpeed: number
  outCurrentSpeed: number
  failed: 1 | 0
  status: 'Active' | 'Completed' | 'Rule Evaluating' | 'DNS Lookup' | 'Establishing Connection'
  completed: 1 | 0
  modified: 1 | 0
  sourcePort: number
  completedDate: number
  outBytes: number
  sourceAddress: string
  localAddress?: string
  requestHeader?: string
  policyName: string
  inBytes: number
  method: string
  pid: number
  replica: 1 | 0
  rule: string
  startDate: number
  setupCompletedDate: number
  URL: string
  processPath?: string
  remoteClientPhysicalAddress?: string
  outMaxSpeed: number
  responseHeader?: string
  timingRecords?: {
    durationInMillisecond: number
    name: string
  }[]
}

export type RequestsT = RequestItemT[]
