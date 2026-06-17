import { Device } from "./device";

export class Home {
  id: string;
  devices: Device[];

  constructor(id: string, devices: Device[]) {
    this.id = id;
    this.devices = devices;
  }

  getDevice(deviceId: string): Device | undefined {
    return this.devices.find((device) => device.id === deviceId);
  }
}
