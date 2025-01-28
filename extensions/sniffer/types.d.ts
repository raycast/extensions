import { Image } from "@raycast/api";

export interface Device {
  ip: string;
  mac: string;
  name?: string;
  avatar?: Image.Asset;
  performance?: number;
}

export interface CachedDevices {
  timestamp: number;
  devices: Device[];
}