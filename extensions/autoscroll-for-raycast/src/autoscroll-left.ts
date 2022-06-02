import { closeMainWindow, showHUD } from "@raycast/api";
import { startAutoscroll } from "./scrollUtils";

export default async () => {
  await closeMainWindow();
  await startAutoscroll("left");
  await showHUD("Left autoscroll started! 🎉");
};
