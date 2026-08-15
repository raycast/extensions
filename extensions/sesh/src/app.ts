import { getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { getEnv } from "./env";

const env = getEnv();

export function openApp() {
  const { openWithApp } = getPreferenceValues<Preferences.CmdConnect>();
  if (!openWithApp) {
    return Promise.reject(new Error("No app selected"));
  }
  return new Promise<void>((resolve, reject) => {
    exec(`open -a ${openWithApp.name}`, { env }, (error, _, stderr) => {
      if (error || stderr) return reject(error?.message ?? stderr);
      return resolve();
    });
  });
}
