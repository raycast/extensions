import { runAppleScript } from "run-applescript";
import { Application, getFrontmostApplication } from "@raycast/api";

export async function scriptQuitAppsWithoutWindow(apps: Application[]) {
  for (let i = 0; i < apps.length; i++) {
    const appName = apps[i].path.split("/").pop()?.replace(".app", "");
    const hasWindow = await scriptGetAppWindow(appName);
    const isRunning = await scriptIsRunning(appName);
    const isFrontmost = await IsFrontmostApp(appName);
    if (!hasWindow && isRunning && !isFrontmost) {
      const script = `tell application "${appName}"
   quit
end tell`;

      try {
        await runAppleScript(script);
      } catch (e) {
        console.error(e);
      }
    }
  }
}

export async function scriptQuitApps(apps: Application[]) {
  for (let i = 0; i < apps.length; i++) {
    const appName = apps[i].path.split("/").pop()?.replace(".app", "");

    const isRunning = await scriptIsRunning(appName);
    if (isRunning) {
      const script = `tell application "${appName}"
   quit
end tell`;

      try {
        await runAppleScript(script);
      } catch (e) {
        console.error(e);
      }
    }
  }
}

async function IsFrontmostApp(applicationName: string | undefined) {
  const app = await getFrontmostApplication();
  return app?.name == applicationName;
}

async function scriptIsRunning(appName: string | undefined) {
  const script = `if application "${appName}" is running then
	return true
else
	return false
end if`;
  try {
    const isRunning = await runAppleScript(script);
    return isRunning == "true";
  } catch (e) {
    console.error(e);
    return false;
  }
}
async function scriptGetAppWindow(appName: string | undefined) {
  const script = `set appName to "${appName}"
tell application "System Events"
    if not (exists process appName) then
        return false
    end if
    set appProcess to first process whose name is appName
    set appWindows to windows of appProcess
    if length of appWindows is 0 then
        return false
    else
        return true
    end if
end tell
`;
  try {
    const hasWindow = await runAppleScript(script);
    return hasWindow == "true";
  } catch (e) {
    return false;
  }
}
