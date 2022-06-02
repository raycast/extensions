import { closeMainWindow, showHUD } from "@raycast/api";
import { stopAutoscroll } from "./scrollUtils";

export default async () => {
  await closeMainWindow();
  await stopAutoscroll();
  await showHUD("Autoscroll stopped! 🎉");
};
