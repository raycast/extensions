import { runAppleScript } from "run-applescript";
import { Apps } from "../types/type";

export async function appIsActive() {
  const script = `tell application "System Events"
	return name of the first process whose frontmost is true
end tell`;

  try {
    return await runAppleScript(script);
  } catch (e) {
    return "";
  }
}

export async function appIsRunning(appName: string) {
  const script = `   tell application "System Events" to set isRunning to exists (processes where name is "${appName}")
   if isRunning then
      return true
   else
      return false
   end if`;

  try {
    const isRunning = await runAppleScript(script);
    return isRunning === "true";
  } catch (e) {
    return false;
  }
}

export async function appCanQuit(appWindowCount: Apps) {
  try {
    const isRunning = await appIsRunning(appWindowCount.name);
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

export async function quitApp(appWindowCount: Apps) {
  const canQuit = await appCanQuit(appWindowCount);
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

export async function quitApps(apps: Apps[]) {
  for (let i = 0; i < apps.length; i++) {
    await quitApp(apps[i]);
  }
}
