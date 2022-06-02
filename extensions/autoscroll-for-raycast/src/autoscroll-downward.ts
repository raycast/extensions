import { closeMainWindow, showHUD } from "@raycast/api";
import { startAutoscroll } from "./scrollUtils";

export default async () => {
  await closeMainWindow();
  await startAutoscroll("down");
  await showHUD("Downward autoscroll started! 🎉");
};
