import { existsSync } from "fs";
import { execSync } from "child_process";
import { Device } from "./devices.model";
import ApplescriptDevicesService from "./devices.service.applescript";
import { getPreferenceValues } from "@raycast/api";

const standardBrewPaths = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];

export default class BlueutilDevicesService extends ApplescriptDevicesService {
  envVars = process.env;

  constructor() {
    super();

    let blueutilDiscovered = false;
    let queuedPaths = standardBrewPaths;

    const { blueutilDirectory: enforcedBlueutilDirectory } = getPreferenceValues<ExtensionPreferences>();
    if (enforcedBlueutilDirectory) {
      queuedPaths = [enforcedBlueutilDirectory];
    }

    queuedPaths.forEach((path) => {
      if (blueutilDiscovered) return;

      blueutilDiscovered = blueutilDiscovered || existsSync(`${path}/blueutil`);
      this.envVars = { ...process.env, PATH: `${process.env.PATH}:${path}:` };
    });

    if (blueutilDiscovered) {
      console.info("Discovered blueutil!");
    } else {
      throw new Error("Could not find 'blueutil'!");
    }
  }

  getDevices(): Device[] {
    const applescriptDevices = super.getDevices();
    try {
      const blueutilOutput = JSON.parse(
        execSync(`blueutil --paired --format json`, {
          env: this.envVars,
        }).toString()
      );

      const blueutilDevicesMacAddresses = blueutilOutput.map((entry: { address: string }) =>
        entry.address.replaceAll("-", ":").toUpperCase()
      );

      const devices = applescriptDevices.filter((device) =>
        blueutilDevicesMacAddresses.includes(device.macAddress.toUpperCase())
      );

      return devices;
    } catch {
      return applescriptDevices;
    }
  }

  connectDevice(mac: string): boolean {
    try {
      execSync(`blueutil --connect ${mac} --wait-connect ${mac} 5`, {
        env: this.envVars,
      });
      return true;
    } catch {
      return false;
    }
  }

  disconnectDevice(mac: string): boolean {
    try {
      execSync(`blueutil --disconnect ${mac} --wait-disconnect ${mac} 5`, {
        env: this.envVars,
      });
      return true;
    } catch {
      return false;
    }
  }
}
