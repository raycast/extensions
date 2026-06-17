import { showHUD } from "@raycast/api";
import { showDesktopWidgets } from "./utils";

export default async function () {
  try {
    showDesktopWidgets();
    await showHUD("Desktop Widgets Visible");
  } catch (error) {
    await showHUD(error as string);
  }
}
