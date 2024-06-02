import { closeMainWindow, environment, getApplications, LaunchType } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { isAutoRestart } from "./types/preferences";
import { getRaycastIsOpen } from "./utils/common-utils";

export default async () => {
  if (environment.launchType == LaunchType.Background) {
    if (!isAutoRestart) {
      return;
    } else {
      if (await getRaycastIsOpen()) {
        return;
      }
    }
  }

  await closeMainWindow();
  const app = await getApplications("/Applications/Raycast.app");
  if (app.length > 0) {
    const quitScript = (app: string) => `
  tell application "${app}"
    quit
  end tell
    `;
    const openScript = (app: string) => `
  tell application "${app}"
    activate
  end tell
    `;
    await runAppleScript(quitScript(app[0].name));
    await runAppleScript(openScript(app[0].name));
  }
};
