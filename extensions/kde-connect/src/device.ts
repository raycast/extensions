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

  isAvailable(): Promise<boolean> {
    if (!this.deviceID) {
      return Promise.reject("No deviceID set");
    }
    return new Promise((resolve, reject) => {
      this.listDevices()
        .then((devices) => {
          resolve(devices.some((device) => device.id === this.deviceID));
        })
        .catch((err) => {
          reject(err);
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

  unpairDevice(deviceID?: string): Promise<void> {
    const targetDeviceID = deviceID || this.deviceID;
    if (!targetDeviceID) {
      return Promise.reject("No deviceID set");
    }
    return new Promise((resolve, reject) => {
      this.executeCommand(KDECFunctions.unpairDevice({ deviceID: targetDeviceID }))
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  share(path: string): Promise<void> {
    if (!this.deviceID) {
      return Promise.reject("No deviceID set");
    }
    return new Promise((resolve, reject) => {
      this.executeCommand(KDECFunctions.share({ deviceID: this.deviceID, args: [path] }))
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  sendText(str: string): Promise<void> {
    if (!this.deviceID) {
      return Promise.reject("No deviceID set");
    }
    return new Promise((resolve, reject) => {
      this.executeCommand(KDECFunctions.sendText({ deviceID: this.deviceID, args: [str] }))
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  sendFiles(paths: string[], toast?: Toast): Promise<void> {
    if (!this.deviceID) {
      return Promise.reject("No deviceID set");
    }
    return new Promise((resolve, reject) => {
      try {
        for (const path of paths) {
          toast && (toast.message = `Sending ${path}`);
          this.executeCommand(KDECFunctions.share({ deviceID: this.deviceID, args: [path] }));
        }
        if (toast) {
          toast.title = "Files Sent";
          toast.message = undefined;
          toast.style = Toast.Style.Success;
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  sendSMS(destination: string, str: string): Promise<void> {
    if (!this.deviceID) {
      return Promise.reject("No deviceID set");
    }
    return new Promise((resolve, reject) => {
      this.executeCommand(KDECFunctions.sendSms({ deviceID: this.deviceID, args: [destination, str] }))
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  ping(deviceID: string): Promise<void> {
    const targetDeviceID = deviceID || this.deviceID;
    if (!targetDeviceID) {
      return Promise.reject("No deviceID set");
    }
    return new Promise((resolve, reject) => {
      this.executeCommand(KDECFunctions.ping({ deviceID: targetDeviceID }))
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}
