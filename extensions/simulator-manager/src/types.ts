export type DeviceStatus = "Booted" | "Shutdown";

export type DeviceType =
  // iOS devices
  | "iPhone"
  | "iPad"
  | "Apple TV"
  | "Apple Watch"
  | "HomePod"
  | "iPod"
  | "Mac"
  // Android devices
  | "Android Phone"
  | "Android Tablet"
  | "Android TV"
  | "Android Wear"
  | "Other";

export type DeviceCategory = "ios" | "android";
export type DeviceDisplayCategory = "all" | "ios" | "android";

export interface Device {
  id: string;
  name: string;
  status: DeviceStatus;
  type: string; // Keeping this as string since it store device identifiers
  runtime: string;
  category: DeviceCategory;
  deviceType: DeviceType; // This is the field that stores the device type like "iPhone", "iPad", etc.
}

export interface SimulatorDevice {
  udid: string;
  name: string;
  state: DeviceStatus;
  deviceTypeIdentifier?: string;
}

export interface Category {
  id: string;
  name: string;
}
