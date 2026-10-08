import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { toggleDockVisibility } from "./utils/applescript-utils";

export default async () => {
  await closeMainWindow();
  await showToast({ title: "Toggling auto hide", style: Toast.Style.Animated });
  await toggleDockVisibility();
  await showHUD("💻 Toggle Dock auto-hide");
};
