import { Application, getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export async function scriptQuitAppsWithoutWindow(apps: Application[]) {
  for (let i = 0; i < apps.length; i++) {
    try {
      const appName = apps[i].name;
      if (
        (await scriptIsRunning(appName)) &&
        !(await isFrontmostApp(appName)) &&
        !(await scriptGetAppWindow(appName))
      ) {
        const script = `
tell application "${appName}"
   quit
end tell`;
        await runAppleScript(script);
      }
    } catch (e) {
      console.error(e);
    }
  }
}

export async function scriptQuitApps(apps: Application[]) {
  for (let i = 0; i < apps.length; i++) {
    try {
      const appName = apps[i].name;
      const isRunning = await scriptIsRunning(appName);
      if (isRunning) {
        const script = `tell application "${appName}"
   quit
end tell`;
        await runAppleScript(script);
      }
    } catch (e) {
      console.error(e);
    }
  }
}

async function isFrontmostApp(applicationName: string | undefined) {
  try {
    const app = await getFrontmostApplication();
    return app?.name == applicationName;
  } catch (e) {
    console.error(e);
    return false;
  }
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
if application appName is running then
  tell application "System Events" to tell process appName
    set windowCount to count of (get every window)
    return windowCount > 0
  end tell
  return false
end if
`;
  try {
    const hasWindow = await runAppleScript(script);
    return hasWindow == "true";
  } catch (e) {
    console.error(e);
    return false;
  }
}
