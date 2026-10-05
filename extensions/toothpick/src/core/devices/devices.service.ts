import ApplescriptDevicesService from "./devices.service.applescript";
import BlueutilDevicesService from "./devices.service.blueutil";
import WindowsDevicesService from "./devices.service.windows";
import { Device } from "./devices.model";

export interface DevicesService {
  getDevices(): Device[];
  connectDevice(mac: string): boolean;
  disconnectDevice(mac: string): boolean;
  refreshBluetooth(): boolean;
}

let currentServiceType: string;
let devicesService: DevicesService;

export function getDevicesService(
  serviceType?: ServiceType | ExtensionPreferences["bluetoothBackend"],
): DevicesService {
  const requestedService = process.platform === "win32" ? ServiceType.Windows : serviceType;
  if (requestedService && currentServiceType !== requestedService) {
    currentServiceType = requestedService;
    switch (requestedService) {
      case ServiceType.AppleScript:
        devicesService = new ApplescriptDevicesService();
        break;
      case ServiceType.Blueutil:
        devicesService = new BlueutilDevicesService();
        break;
      case ServiceType.Windows:
        devicesService = new WindowsDevicesService();
        break;
    }
  }
  return devicesService;
}

enum ServiceType {
  AppleScript = "applescript",
  Blueutil = "blueutil",
  Windows = "windows",
}
