export type DeviceCategory = string;

export interface Device {
  deviceId: string;
  label?: string;
  deviceTypeName: string;
  components: Array<{
    categories: Array<{ name: string }>;
    capabilities: Array<{ timestamp: string }>;
  }>;
  id: string;
  name: string;
  roomId: string;
  status: DeviceStatus;
}

export interface LocationMode {
  id: string;
  name: string;
}

export enum DeviceStatus {
  ONLINE = "online",
  OFFLINE = "offline",
  UNKNOWN = "unknown",
}
