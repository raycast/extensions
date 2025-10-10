export interface BluetoothDevice {
  serialNumber: string;
  name: string;
  address: string;
  connected: boolean;
  rssi: number;
  paired?: boolean;
  isSavedInLocalStorage: boolean;
}

export type BLEDeviceInfo = {
  device_address: string;
  device_batteryLevelLeft?: string;
  device_batteryLevelRight?: string;
  device_caseVersion?: string;
  device_firmwareVersion?: string;
  device_minorType: string;
  device_productID?: string;
  device_rssi?: string;
  device_serialNumber?: string;
  device_serialNumberLeft?: string;
  device_serialNumberRight?: string;
  device_services?: string;
  device_vendorID?: string;
};
