export interface Device {
  displayName: string;
  name: string;
  booted: boolean;
  ID?: string;
  version?: string;
  platform: Platform;
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
