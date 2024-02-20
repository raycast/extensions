import { showHUD } from "@raycast/api";
import { areDesktopIconsHidden, hideDesktopIcons, showDesktopIcons } from "./utils";

export default async function () {
  if (areDesktopIconsHidden()) {
    hideDesktopIcons();
    await showHUD("Desktop Icons Hidden");
  } else {
    showDesktopIcons();
    await showHUD("Desktop Icons Visible");
  }
}
