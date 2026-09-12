import { getFrontmostApplication, showToast, Toast, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

import { BrowsersEnum } from "./enums";
import { ERROR_MESSAGES } from "./constants";

// This will be inserted into the user's browser
const TOGGLE_DESIGN_MODE_SCRIPT = `javascript: void (function () {
  if (document.designMode === 'on') {
    document.designMode = 'off';
  } else {
    document.designMode = 'on';
  }
})();`;

export default async function toggleDesignMode() {
  await closeMainWindow();

  await showToast({
    style: Toast.Style.Animated,
    title: "Running Toggle Design Mode...",
  });

  const app = (await getFrontmostApplication()).name;

  try {
    if (app === BrowsersEnum.safari) {
      await runAppleScript(
        `tell application "${BrowsersEnum.safari}" to do JavaScript "${TOGGLE_DESIGN_MODE_SCRIPT}" in document 1`,
      );
    } else {
      await runAppleScript(
        `tell application "${app}"
          execute front window's active tab javascript "${TOGGLE_DESIGN_MODE_SCRIPT}"
        end tell`,
      );
    }

    await showToast({ title: `Toggled Design Mode in ${app}` });
  } catch (error) {
    let errorMessage: string;

    switch (app) {
      case BrowsersEnum.safari:
        errorMessage = ERROR_MESSAGES.safariDisabledJavaScript;
        break;
      case BrowsersEnum.chrome:
      case BrowsersEnum.brave:
        errorMessage = ERROR_MESSAGES.chromeDisabledJavaScript;
        break;
      default:
        errorMessage = ERROR_MESSAGES.unableToRun(app);
        break;
    }

    showToast({
      style: Toast.Style.Failure,
      title: errorMessage,
    });
  }
}
