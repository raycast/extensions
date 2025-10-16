import { Application, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { env } from "./env";

interface Preferences {
  openWithApp: Application;
}

export function openApp() {
  const { openWithApp } = getPreferenceValues<Preferences>();
  return new Promise<void>((resolve, reject) => {
    exec(`open -a ${openWithApp.name}`, { env }, (error, _, stderr) => {
      if (error || stderr) return reject(error?.message ?? stderr);
      return resolve();
    });
  });
}
