import { closeMainWindow, showHUD } from "@raycast/api";
import { startAutoscroll } from "./scrollUtils";

export default async () => {
  await closeMainWindow();
  await startAutoscroll("up");
  await showHUD("Upward autoscroll started! 🎉");
};
