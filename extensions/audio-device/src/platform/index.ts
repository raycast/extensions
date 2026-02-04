export enum TransportType {
  Avb = "avb",
  Aggregate = "aggregate",
  Airplay = "airplay",
  Autoaggregate = "autoaggregate",
  Bluetooth = "bluetooth",
  BluetoothLowEnergy = "bluetoothle",
  "Built-In" = "builtin",
  DisplayPort = "displayport",
  Firewire = "firewire",
  HDMI = "hdmi",
  PCI = "pci",
  Thunderbolt = "thunderbolt",
  Usb = "usb",
  Virtual = "virtual",
  Unknown = "unknown",
  Headphones = "headphones",
  Microphone = "microphone",
  Speakers = "speakers",
  SPDIF = "spdif",
}

export type Platform = "macOS" | "Windows";

export const platform = (process.platform === "win32" ? "Windows" : "macOS") as Platform;

export const isMacOS = platform === "macOS";
export const isWindows = platform === "Windows";

export type AudioDevice = {
  name: string;
  isInput: boolean;
  isOutput: boolean;
  id: string;
  uid: string;
  transportType?: string;
  index?: number;
  isDefault?: boolean;
  isCommunication?: boolean;
};

export interface PlatformAudioAPI {
  getAllDevices(): Promise<AudioDevice[]>;
  getInputDevices(): Promise<AudioDevice[]>;
  getOutputDevices(): Promise<AudioDevice[]>;
  getDefaultOutputDevice(): Promise<AudioDevice>;
  getDefaultInputDevice(): Promise<AudioDevice>;
  getDefaultSystemDevice?: () => Promise<AudioDevice>;
  setDefaultOutputDevice(deviceId: string): Promise<void>;
  setDefaultInputDevice(deviceId: string): Promise<void>;
  setDefaultSystemDevice?(deviceId: string): Promise<void>;
  setDefaultCommunicationOutputDevice?(deviceId: string): Promise<void>;
  setDefaultCommunicationInputDevice?(deviceId: string): Promise<void>;
  setOutputDeviceVolume?(deviceId: string, volume: number): Promise<void>;
  getOutputDeviceVolume?(deviceId: string): Promise<number | undefined>;
  createAggregateDevice?: (
    name: string,
    mainDeviceId: string,
    otherDeviceIds?: string[],
    options?: { multiOutput?: boolean },
  ) => Promise<AudioDevice>;
  destroyAggregateDevice?(deviceId: string): Promise<void>;
}

let apiInstance: PlatformAudioAPI | null = null;

export async function getAudioAPI(): Promise<PlatformAudioAPI> {
  if (apiInstance) {
    return apiInstance;
  }

  if (isMacOS) {
    const { macosAudioAPI } = await import("./macos");
    apiInstance = macosAudioAPI;
  } else if (isWindows) {
    const { windowsAudioAPI } = await import("./windows");
    apiInstance = windowsAudioAPI;
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return apiInstance;
}
