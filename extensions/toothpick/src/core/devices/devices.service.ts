import ApplescriptDevicesService from "./devices.service.applescript";
import BlueutilDevicesService from "./devices.service.blueutil";
import { Device } from "./devices.model";

export interface DevicesService {
  getDevices(): Device[];
  connectDevice(mac: string): boolean;
  disconnectDevice(mac: string): boolean;
}

let currentServiceType: string;
let devicesService: DevicesService;

export function getDevicesService(
  serviceType?: ServiceType | ExtensionPreferences["bluetoothBackend"]
): DevicesService {
  if (serviceType && currentServiceType !== serviceType) {
    currentServiceType = serviceType;
    switch (serviceType) {
      case ServiceType.AppleScript:
        devicesService = new ApplescriptDevicesService();
        break;
      case ServiceType.Blueutil:
        devicesService = new BlueutilDevicesService();
        break;
    }
  }
  return devicesService;
}

enum ServiceType {
  AppleScript = "applescript",
  Blueutil = "blueutil",
}
