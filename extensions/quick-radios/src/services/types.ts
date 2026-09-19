export interface WifiStatus {
  isOn: boolean;
  isConnected: boolean;
  ssid?: string;
  bssid?: string;
  interfaceName?: string;
  signalPercent?: number;
  radioType?: string;
  band?: string;
  channel?: string;
  authentication?: string;
  cipher?: string;
  ipAddress?: string;
  macAddress?: string;
  gateway?: string;
  receiveRateMbps?: number;
  transmitRateMbps?: number;
  isTestingSpeed?: boolean;
  internetSpeed?: {
    downloadMbps: number;
    uploadMbps: number;
  };
  sessionData?: {
    downloadedBytes: number;
    uploadedBytes: number;
    totalBytesIn: number;
    totalBytesOut: number;
  };
}

export interface WifiNetwork {
  ssid: string;
  bssid?: string;
  signalPercent: number;
  authentication: string;
  encryption?: string;
  isSaved: boolean;
  isConnected: boolean;
  band?: string;
}

export interface BluetoothStatus {
  isOn: boolean;
}

export type BluetoothDeviceCategory =
  "audio" | "peripheral" | "controller" | "phone" | "other";

export interface BluetoothDevice {
  id: string;
  name: string;
  address?: string;
  category: BluetoothDeviceCategory;
  isConnected: boolean;
  isPaired?: boolean;
  batteryPercent?: number;
}
