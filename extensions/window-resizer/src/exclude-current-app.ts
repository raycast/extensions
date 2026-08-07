import { showHUD, showToast, Toast, LocalStorage } from "@raycast/api";
import { getActiveWindow } from "./utils/window-manager";

export default async function main() {
  try {
    const activeWindow = await getActiveWindow();
    const appName = activeWindow.appName;
    if (!appName) {
      await showHUD("No active application detected");
      return;
    }

    const rawExcluded = await LocalStorage.getItem<string>("excluded-apps");
    const excludedList: string[] = rawExcluded ? JSON.parse(rawExcluded) : [];

    const isAlreadyExcluded = excludedList.some((app) => app.toLowerCase() === appName.toLowerCase());

    if (isAlreadyExcluded) {
      await showHUD(`${appName} is already excluded`);
    } else {
      excludedList.push(appName);
      await LocalStorage.setItem("excluded-apps", JSON.stringify(excludedList));
      await showHUD(`Excluded ${appName} from resizing/centering`);
    }
  } catch (error: unknown) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to exclude active application",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
