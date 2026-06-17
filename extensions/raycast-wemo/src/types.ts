export interface DeviceInfo {
  deviceType: string;
  friendlyName: string;
  modelName: string;
  binaryState: "0" | "1";
  brightness: number;
  macAddress: string;
}
