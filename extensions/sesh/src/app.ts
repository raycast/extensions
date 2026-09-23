import { getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import { getEnv } from "./env";

export function openApp() {
  const { openWithApp } = getPreferenceValues<Preferences.CmdConnect | Preferences.CmdConnectWindow>();
  if (!openWithApp) {
    return Promise.reject(new Error("No app selected"));
  }
  return new Promise<void>((resolve, reject) => {
    execFile("open", ["-a", openWithApp.name], { env: getEnv() }, (error, _, stderr) => {
      if (error || stderr) return reject(error?.message ?? stderr);
      return resolve();
    });
  });
}
