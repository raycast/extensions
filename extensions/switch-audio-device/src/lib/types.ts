export type DeviceType = "output" | "input";

export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
  type: DeviceType;
}

export interface AudioProvider {
  listOutputDevices(): Promise<AudioDevice[]>;
  setOutputDevice(deviceId: string): Promise<void>;
  listInputDevices(): Promise<AudioDevice[]>;
  setInputDevice(deviceId: string): Promise<void>;
}
