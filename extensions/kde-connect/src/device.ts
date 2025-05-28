import { exec } from "child_process";
import { appPath, KDECFunctions, parseDeviceInfo } from "./connector";
import { getPreferenceValues, LocalStorage, Toast } from "@raycast/api";
import { StorageKey, Preferences } from "./storage";

export interface KDEDevice {
  name: string;
  id: string;
  paired: boolean;
  reachable: boolean;
}

export class KDEConnect {
  deviceID?: string;
  preference: Preferences;

  constructor(deviceID?: string) {
    this.deviceID = deviceID;
    this.preference = getPreferenceValues<Preferences>();
  }

  private executeCommand(command: string | null): Promise<string> {
    return new Promise((resolve, reject) => {
      if (command === null) {
        throw "Command exection error: command is null";
      }
      exec(`'${appPath}' ${command} 2> /tmp/kde-connect-raycast.log`, (err, stdout) => {
        if (err) {
          reject(err);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  async isAvailable(): Promise<boolean> {
    if (!this.deviceID) {
      throw new Error("No deviceID set");
    }
    const devices = await this.listDevices();

    return devices.some((device) => device.id === this.deviceID);
  }

  listDevices(): Promise<KDEDevice[]> {
    return new Promise((resolve, reject) => {
      const promise = this.executeCommand(KDECFunctions.listDevices({}));

      promise
        .then((result) => {
          const devices = result
            .split("\n")
            .filter((line) => line.startsWith("- "))
            .map(parseDeviceInfo)
            .filter((device) => device !== undefined) as KDEDevice[];

          LocalStorage.setItem(StorageKey.pairedDevices, JSON.stringify(devices.filter((device) => device.paired)));
          resolve(devices);
        })
        .catch(reject);
    });
  }

  pairDevice(deviceID: string): Promise<string> {
    return this.executeCommand(KDECFunctions.pairDevice({ deviceID: deviceID }));
  }

  unpairDevice(deviceID?: string): Promise<string> {
    const targetDeviceID = deviceID || this.deviceID;
    if (!targetDeviceID) {
      return Promise.reject("No deviceID set");
    }

    return this.executeCommand(KDECFunctions.unpairDevice({ deviceID: targetDeviceID }));
  }

  share(path: string): Promise<string> {
    if (!this.deviceID) {
      return Promise.reject("No deviceID set");
    }

    return this.executeCommand(KDECFunctions.share({ deviceID: this.deviceID, args: [path] }));
  }

  sendText(str: string): Promise<string> {
    if (!this.deviceID) {
      return Promise.reject("No deviceID set");
    }

    return this.executeCommand(KDECFunctions.sendText({ deviceID: this.deviceID, args: [str] }));
  }

  async sendFiles(paths: string[], toast?: Toast) {
    if (!this.deviceID) {
      throw new Error("No deviceID set");
    }
    for (const path of paths) {
      toast && (toast.message = `Sending ${path}`);
      await this.executeCommand(KDECFunctions.share({ deviceID: this.deviceID, args: [path] }));
    }
    if (toast) {
      toast.title = "Files Sent";
      toast.message = undefined;
      toast.style = Toast.Style.Success;
    }
  }

  sendSMS(destination: string, str: string): Promise<string> {
    if (!this.deviceID) {
      return Promise.reject("No deviceID set");
    }

    return this.executeCommand(KDECFunctions.sendSms({ deviceID: this.deviceID, args: [destination, str] }));
  }

  ping(deviceID: string): Promise<string> {
    const targetDeviceID = this.deviceID || deviceID;
    if (!targetDeviceID) {
      return Promise.reject("No deviceID set");
    }

    return this.executeCommand(KDECFunctions.ping({ deviceID: targetDeviceID }));
  }
}
