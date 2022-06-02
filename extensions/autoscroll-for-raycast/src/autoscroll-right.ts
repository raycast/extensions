import { closeMainWindow, showHUD } from "@raycast/api";
import { startAutoscroll } from "./scrollUtils";

export default async () => {
  await closeMainWindow();
  await startAutoscroll("right");
  await showHUD("Right autoscroll started! 🎉");
};
