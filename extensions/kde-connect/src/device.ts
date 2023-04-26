import { exec } from "child_process";
import { appPath, KDECFunctions, parseDeviceInfo } from "./connector";
import { LocalStorage, showToast } from "@raycast/api";
import { StorageKey } from "./storage";
export interface KDEDevice {
  name: string;
  id: string;
  paired: boolean;
  reachable: boolean;
}

export class KDEConnect {
  deviceID: string | undefined;

  constructor(deviceID?: string) {
    this.deviceID = deviceID;
  }

  private executeCommand(command: string | null): Promise<string> {
    return new Promise((resolve, reject) => {
      let output = "";
      if (command === null) {
        showToast({ title: "Command exection error" });
        reject(output);
      }
      exec(`${appPath} ${command} 2> /tmp/kde-connect-raycast.log`, (err, stdout) => {
        if (err) {
          reject(err);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  listDevices(): Promise<KDEDevice[]> {
    return new Promise((resolve) => {
      const promise = this.executeCommand(KDECFunctions.listDevices({}));

      promise.then((result) => {
        const devices = result
          .split("\n")
          .filter((line) => line.startsWith("- "))
          .map(parseDeviceInfo)
          .filter((device) => device !== undefined) as KDEDevice[];

        LocalStorage.setItem(StorageKey.pairedDevices, JSON.stringify(devices.filter((device) => device.paired)));
        resolve(devices);
      });
    });
  }

  pairDevice(deviceID: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.executeCommand(KDECFunctions.pairDevice({ deviceID: deviceID }))
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}
