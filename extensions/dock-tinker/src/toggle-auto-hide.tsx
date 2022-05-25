import { closeMainWindow, showHUD } from "@raycast/api";
import { toggleDockVisibility } from "./utils/applescript-utils";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  await toggleDockVisibility();
  await showHUD("Toggle Dock auto-hide");
};
