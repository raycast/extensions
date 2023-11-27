import { showHUD } from "@raycast/api";
import { spawn } from "child_process";
import * as fs from "fs";

function isEmptyTrim(str: string): boolean {
  return str.trim().length === 0;
}

export default async function checkAdbExists() {
  const adb = `${process.env.HOME}/Library/Android/sdk/platform-tools/adb`;

  if (!fs.existsSync(adb)) {
    await showHUD(`❗️ADB not found here: ${adb}`);
    process.exit(-1);
  } else {
    return adb;
  }
}

export interface DeviceDetails {
  id: string,
  model: string
}

export async function listDevices(): Promise<DeviceDetails[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const info = await executeAdbCommand("devices -l")
      const devices: DeviceDetails[] = []
      info.split("\n").forEach((line, index) => {
        if (index != 0 && !isEmptyTrim(line)) { // Skip first line, its just saying "List of devices attached", and empty lines
          const deviceId = line.split(" ")[0]
          const deviceModel = line.split(" ")[12].split(":")[1]
          devices.push({ id: deviceId, model: deviceModel })
        }
      });
      devices.forEach((device) => {
        console.log(`DAMBAKK DEVICE: ${device.id}, ${device.model}`);
      })
      resolve(devices)
    } catch (error) {
      reject(error)
    }
  }
  );
}

export async function installApk(apkFile: string, deviceId: string) {
  return executeAdbCommand(`-s ${deviceId} install -r -d ${apkFile}`)
}

export async function launchApp(appPackageName: string, deviceId: string, buypassIdQa01: string | undefined) {
  if (buypassIdQa01 == undefined) {
    return executeAdbCommand(`-s ${deviceId} shell am start -n ${appPackageName}/no.norsktipping.android.MainActivity`)
  } else {
    return executeAdbCommand(`-s ${deviceId} shell am start -n ${appPackageName}/no.norsktipping.android.MainActivity -e environment qa01 -e buypassId ${buypassIdQa01}`)
  }
}

const executeAdbCommand = async (
  command: string,
): Promise<string> => {
  console.log(`About to run adb command: adb ${command}`)
  const commandAsList = command.split(" ")
  return new Promise((resolve, reject) => {
    const install = spawn(`${process.env.HOME}/Library/Android/sdk/platform-tools/adb`, commandAsList)
    const output: string[] = []
    install.stdout.on("data", (data) => {
      console.log(`ADB OUTPUT: ${data}`);
      output.push(data)
    })
    install.stderr.on('data', (data) => {
      console.error(`ADB ERROR: ${data}`);
      output.push(data)
    });
    install.on("exit", (exitCode) => {
      console.log(`ADB EXIT: ${exitCode}`)
      if (exitCode == 0) {
        resolve(output.join())
      } else {
        reject(exitCode)
      }
    })
  })
};