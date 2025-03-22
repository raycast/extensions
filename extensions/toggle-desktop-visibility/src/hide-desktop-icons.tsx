import { showHUD } from "@raycast/api";
import { hideDesktopIcons } from "./utils";

export default async function () {
  hideDesktopIcons();
  await showHUD("Desktop Icons Hidden");
}
