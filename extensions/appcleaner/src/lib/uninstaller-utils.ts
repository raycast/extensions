import type { Application } from "@raycast/api";

import { exec } from "child_process";
import fs from "fs";

const APP_CLEANER = "/Applications/AppCleaner.app";
const PEAR_CLEANER = "/Applications/PearCleaner.app";

export function checkDependencies(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(APP_CLEANER)) return resolve();
    if (fs.existsSync(PEAR_CLEANER)) return resolve();
    reject();
  });
}

function getAppName(app: string): string {
  const parts = app.split("/");
  return parts[parts.length - 1].split(".app")[0];
}

function getUninstaller(preferred?: string): string {
  if (preferred && fs.existsSync(preferred)) return getAppName(preferred);
  if (fs.existsSync(APP_CLEANER)) return getAppName(APP_CLEANER);
  if (fs.existsSync(PEAR_CLEANER)) return getAppName(PEAR_CLEANER);
  return "";
}

export function launchUninstaller(uninstaller: string | undefined, app: Application): Promise<void> {
  return new Promise((resolve, reject) => {
    uninstaller = getUninstaller(uninstaller);
    if (!uninstaller) return reject(new Error("No uninstaller found"));

    exec(`open -a ${uninstaller} "${app.path}"`, (error) => {
      if (error) return reject(error);
      resolve();
    });
  });
}
