export interface Device {
  displayName: string;
  name: string;
  booted: boolean;
  identifier?: string;
  version?: string;
  platform: Platform;
  type: DeviceType;
}

export interface Command {
  name: string;
  description: string;
  id: string;
  platform: Platform;
  tag: number;
  needBootedDevice: boolean;
  bootsDevice?: boolean;
}

export enum Platform {
  ios = "ios",
  android = "android",
}

export enum DeviceType {
  virtual = "virtual",
  physical = "physical",
}
