import { execFileSync } from "child_process";
import { resolve } from "path";
import { environment } from "@raycast/api";
import { Device } from "./devices.model";
import { mapDevice } from "./devices.mapper";
import { RawDeviceData } from "./devices.types";
import { DevicesService } from "./devices.service";

type WindowsDevice = {
  name: string;
  macAddress: string;
  type?: string;
  connected: boolean;
  controllable: boolean;
  present: boolean;
  category?: string;
};

export default class WindowsDevicesService implements DevicesService {
  getDevices(): Device[] {
    const result = this.run("List");
    const devices = (Array.isArray(result) ? result : [result]) as WindowsDevice[];
    return devices
      .filter((device) => device.name && device.macAddress)
      .map((device) =>
        mapDevice({
          [device.name]: {
            device_address: device.macAddress,
            device_minorType: device.type || "Bluetooth",
            device_connected: `${device.connected}`,
            device_controllable: `${device.controllable}`,
            device_present: `${device.present}`,
            device_category: device.category || "",
          },
        } as RawDeviceData),
      );
  }

  connectDevice(mac: string): boolean {
    return this.runAction("Connect", mac);
  }

  disconnectDevice(mac: string): boolean {
    return this.runAction("Disconnect", mac);
  }

  refreshBluetooth(): boolean {
    return this.run("RefreshAll").success === true;
  }

  private run(action: "List" | "Connect" | "Disconnect" | "RefreshAll", mac?: string) {
    if (mac && !/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(mac)) throw new Error("Invalid MAC address.");
    const script = resolve(environment.assetsPath, "scripts/bluetooth.ps1");
    const output = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        script,
        "-Action",
        action,
        ...(mac ? ["-MacAddress", mac] : []),
      ],
      {
        encoding: "utf8",
        timeout: action === "List" ? 15_000 : action === "Connect" ? 45_000 : 35_000,
        windowsHide: true,
      },
    );
    return JSON.parse(output.trim());
  }

  private runAction(action: "Connect" | "Disconnect", mac: string): boolean {
    try {
      return this.run(action, mac).success === true;
    } catch {
      return false;
    }
  }
}
