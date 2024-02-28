import { getApplications, getPreferenceValues } from "@raycast/api";
import fs from "fs";
import { spawn } from "child_process";
import { exec } from "child_process";
import expandTilde from "expand-tilde";
import path from "path";

export async function isAndroidStudioInstalled() {
  return (await getApplications()).find((app) => {
    (app.name === "Android studio") != undefined ? true : false;
  });
}

export async function listDirectories(folder: string) {
  return fs.promises.readdir(folder, { withFileTypes: true });
}

export const emulatorPath = `ANDROID_AVD_HOME="${androidAVD()}" ${androidSDK()}/emulator/emulator`;

export function androidSDK() {
  const sdk = getPreferenceValues().androidSDK;
  return sdk.replace("~", expandTilde("~"));
}
export function androidAVD() {
  const avd = getPreferenceValues().androidAVD;
  return avd.replace("~", expandTilde("~"));
}

export const adbPath = path.join(androidSDK(), "platform-tools", "adb");

export function isValidDirectory(path: string) {
  try {
    fs.lstatSync(path).isDirectory();
  } catch (error) {
    return false;
  }
  return true;
}

export function hasReadPermission(path: string) {
  let err;
  try {
    fs.accessSync(path, fs.constants.R_OK);
  } catch (error) {
    console.log("%s doesn't have read permission", path);
    err = error;
  }
  return err != null;
}

export function runCommand(
  cmd: string,
  output: ((out: string) => void) | undefined,
  error: ((error: string) => void) | undefined
) {
  const childProcess = spawn(cmd, [], { shell: true });

  childProcess.stdout.on("data", function (data: string) {
    if (output) {
      output(data.toString());
    }
    console.log("stdout: " + data);
  });

  childProcess.stderr.on("data", function (data: string) {
    console.log("stderr: " + data);
    if (error) {
      error(data.toString());
    }
  });
}

export async function executeAsync(cmd: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    exec(cmd, (err: any, stdout: string) => {
      if (err != null) {
        reject(err);
        return;
      }
      resolve(stdout);
    });
  });
}

export async function setTmeoutAsync(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
export function isNumber(value?: string | number): boolean {
  return value != null && value !== "" && !isNaN(Number(value.toString()));
}
