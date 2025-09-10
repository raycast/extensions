import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export async function restartApp(appName: string): Promise<void> {
  try {
    await runAppleScript(`
      tell application "${appName}" to quit
      repeat until not (application "${appName}" is running)
        delay 0.2
      end repeat
      delay 0.5
      tell application "${appName}" to launch
    `);
    await showToast({ style: Toast.Style.Success, title: ` Restarted ${appName}` });
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: ` Failed to restart ${appName}`, message: String(error) });
  }
}
