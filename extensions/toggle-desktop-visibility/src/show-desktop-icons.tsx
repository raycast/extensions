import { showHUD } from "@raycast/api";
import { showDesktopIcons } from "./utils";

export default async function () {
  showDesktopIcons();
  await showHUD("Desktop Icons Visible");
}
