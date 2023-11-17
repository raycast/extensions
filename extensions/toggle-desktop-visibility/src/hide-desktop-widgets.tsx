import { showHUD } from "@raycast/api";
import { hideDesktopWidgets } from "./utils";

export default async function () {
  try {
    hideDesktopWidgets();
    await showHUD("Desktop Widgets Hidden");
  } catch (error) {
    await showHUD(error as string);
  }
}
