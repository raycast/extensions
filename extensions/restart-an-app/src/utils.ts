import { showHUD, showToast, Toast, popToRoot } from "@raycast/api";
import { exec } from "child_process";

export function restartApp(appName: string) {
  showToast({ title: "Restarting " + appName, style: Toast.Style.Animated });

  const script = `
    tell application "${appName}" to quit
    delay 1
    tell application "${appName}" to activate
  `;

  exec(`osascript -e '${script}'`, (error) => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: `Failed to restart ${appName}`,
      });
    } else {
      showHUD(`Restarted ${appName}`);
    }
    popToRoot();
  });
}
