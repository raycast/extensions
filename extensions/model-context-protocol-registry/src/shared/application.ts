import { Application, getApplications, open } from "@raycast/api";
import { usePromise, withCache } from "@raycast/utils";
import { exec } from "child_process";
import { setTimeout } from "timers/promises";
import { promisify } from "util";

const execa = promisify(exec);

export function useApplications() {
  return usePromise(async () => {
    return await withCache(getApplications)();
  });
}

export async function restartApplication(application: Application) {
  await quitApplication(application);
  await setTimeout(1000);
  await open(application.path);
}

async function quitApplication(application: Application) {
  const isRunning = await isApplicationRunning(application);
  if (!isRunning) {
    return;
  }

  await execa(`osascript -e 'quit app "${application.name}"'`);
}

async function isApplicationRunning(application: Application) {
  try {
    const { stdout } = await execa(`pgrep -f "${application.path}"`);
    return stdout.trim();
  } catch (error) {
    // Ignore error if application is not running
    console.error(error);
    return false;
  }
}
