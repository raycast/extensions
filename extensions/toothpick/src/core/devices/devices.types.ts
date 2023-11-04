export type RawDeviceData = Record<string, Record<string, string>>;

export type DeviceDefinition = {
  name: string;
} & Partial<DeviceBatteryLevels>;

export type DeviceBatteryLevels = {
  main: string | undefined;
  case: string | undefined;
  left: string | undefined;
  right: string | undefined;
};
