import { runAppleScript } from "run-applescript";
import { App } from "../types/type";
import { appsWithBundle } from "./common-utils";

export async function getAllBundleProcess() {
  const script = `tell application "System Events"
	get the bundle identifier of processes
end tell`;

  try {
    const allProcess = await runAppleScript(script);
    return allProcess.split(", ");
  } catch (e) {
    return appsWithBundle;
  }
}

export async function appCanQuit(appWindowCount: App, allProcess: string[]) {
  try {
    const isRunning = allProcess.includes(appWindowCount.bundleProcessName);
    if (!isRunning) return false;

    const script = `tell application "${appWindowCount.name}"
   count windows 
end tell`;
    const hasWindows = await runAppleScript(script);
    return hasWindows == appWindowCount.windows;
  } catch (e) {
    return false;
  }
}

export async function quitApp(appWindowCount: App, allProcess: string[]) {
  const canQuit = await appCanQuit(appWindowCount, allProcess);
  if (!canQuit) return;
  const script = `tell application "${appWindowCount.name}"
   quit
end tell`;

  try {
    await runAppleScript(script);
  } catch (e) {
    console.error(e);
  }
}

export async function quitApps(apps: App[]) {
  const allProcess = await getAllBundleProcess();
  for (let i = 0; i < apps.length; i++) {
    await quitApp(apps[i], allProcess);
  }
}
