import { exec } from "child_process";
import path from "path";
import os from "os";

export async function executeAsync(cmd: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    exec(cmd, (err, stdout) => {
      if (err != null) {
        reject(err);
        return;
      }
      resolve(stdout);
    });
  });
}

export function isNumber(value?: string | number): boolean {
  return value != null && value !== "" && !isNaN(Number(value.toString()));
}
export async function setTmeoutAsync(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const androidSdkFolder = path.join(os.homedir(), "Library", "Android", "sdk");
export const emulatorPath = path.join(androidSdkFolder, "emulator", "emulator");
export const adbPath = path.join(androidSdkFolder, "platform-tools", "adb");
