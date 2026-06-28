import { showHUD, closeMainWindow } from "@raycast/api";
import { toggleConfigValue, CONFIG_TOGGLES } from "./utils/config";
import { configExists, showConfigErrorIfNeeded } from "./utils/plist";
import { isHelperRunning, reloadHelper } from "./utils/helper";

export default async function togglePreciseScroll() {
  try {
    await closeMainWindow();

    if (!configExists()) {
      await showConfigErrorIfNeeded();
      return;
    }

    const toggle = CONFIG_TOGGLES.preciseScroll;
    const { newState } = toggleConfigValue(toggle.key);
    const message = newState === "enabled" ? toggle.enabledMessage : toggle.disabledMessage;

    if (isHelperRunning()) {
      reloadHelper();

      await showHUD(message);
    } else {
      await showHUD(`${message} (start the app to apply changes)`);
    }
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
