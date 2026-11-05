import { LaunchType, LocalStorage, closeMainWindow, launchCommand } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { HIDDEN_KEY } from "./lib/menu-bar-visibility";

export default async () => {
  try {
    await LocalStorage.removeItem(HIDDEN_KEY);
    await closeMainWindow();
    await launchCommand({ name: "menu-bar", type: LaunchType.UserInitiated });
  } catch (e) {
    await showFailureToast(e, { title: "Could not show Rex in the menu bar" });
  }
};
