import { closeMainWindow, showHUD } from "@raycast/api";
import { stopRecording } from "./lib/recording";

export default async function Command() {
  await closeMainWindow();
  if (!(await stopRecording())) {
    await showHUD("No GIF recording running");
  }
}
