export type DeviceState =
  | "ONLINE"
  | "OFFLINE"
  | "PENDING_ADOPTION"
  | "UPDATING"
  | "GETTING_READY"
  | "ADOPTING"
  | "DELETING"
  | "CONNECTION_INTERRUPTED"
  | "ISOLATED";

export type DeviceFeature = "switching" | "accessPoint" | "gateway";

export type DeviceInterface = "ports" | "radios";

export type DeviceActions = "RESTART";

export interface ListDevice {
  id: string;
  name: string;
  model: string;
  macAddress: string;
  ipAddress: string;
  state: DeviceState;
  features: DeviceFeature[];
  interfaces: DeviceInterface[];
}

export type ListDevices = ListDevice[];

export type PortState = "UP" | "DOWN" | "UNKNOWN";

export type PortConnector = "RJ45" | "SFP" | "SFPPLUS" | "SFP28" | "QSFP28";
export const PortConnectorsPretty = {
  RJ45: "RJ45",
  SFP: "SFP",
  SFPPLUS: "SFP+",
  SFP28: "SFP28",
  QSFP28: "QSFP28",
};

export type WlanStandard = "802.11a" | "802.11b" | "802.11g" | "802.11n" | "802.11ac" | "802.11ax" | "802.11be";

export type FrequencyGHz = "2.4" | "5" | "6" | "60";

export interface Port {
  idx: number;
  state: PortState;
  connector: PortConnector;
  maxSpeedMbps: number;
  speedMbps: number;
}

export interface Radio {
  wlanStandard: WlanStandard;
  frequencyGHz: FrequencyGHz;
  channelWidthMHz: number;
  channel: number;
}

export interface DeviceFeatures {
  switching?: string;
  accessPoint?: string;
}

export interface DeviceInterfaces {
  ports: Port[];
  radios: Radio[];
}

export interface DeviceUplink {
  deviceId: string;
  deviceName?: string;
}

export interface Device {
  /** Unique identifier in UUID format */
  id: string;
  name: string;
  model: string;
  supported: boolean;
  macAddress: string;
  ipAddress: string;
  state: DeviceState;
  firmwareVersion: string;
  firmwareUpdatable: boolean;
  /** ISO 8601 date-time string */
  adoptedAt: string;
  /** ISO 8601 date-time string */
  provisionedAt: string;
  /** Reference to configuration UUID */
  configurationId: string;
  uplink: DeviceUplink;
  features: DeviceFeatures;
  interfaces: DeviceInterfaces;
}

export type Devices = Device[];

export interface RadioStats {
  frequencyGHz: FrequencyGHz;
  txRetriesPct: number;
}

export interface UplinkStats {
  txRateBps: number;
  rxRateBps: number;
}

export interface InterfaceStats {
  radios: RadioStats[];
}

export interface DeviceStats {
  uptimeSec: number;
  lastHeartbeatAt: string;
  nextHeartbeatAt: string;
  loadAverage1Min: number;
  loadAverage5Min: number;
  loadAverage15Min: number;
  cpuUtilizationPct: number;
  memoryUtilizationPct: number;
  uplink: UplinkStats;
  interfaces: InterfaceStats;
}
