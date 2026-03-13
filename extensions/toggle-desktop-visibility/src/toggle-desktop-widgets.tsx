import { showHUD } from "@raycast/api";
import { areDesktopWidgetsHidden, hideDesktopWidgets, showDesktopWidgets } from "./utils";

export default async function () {
  try {
    if (areDesktopWidgetsHidden()) {
      hideDesktopWidgets();
      await showHUD("Desktop Widgets Hidden");
    } else {
      showDesktopWidgets();
      await showHUD("Desktop Widgets Visible");
    }
  } catch (error) {
    await showHUD(error as string);
  }
}
