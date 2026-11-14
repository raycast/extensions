import { closeMainWindow, environment, showHUD } from "@raycast/api";
import { toggleOverlay } from "swift:../swift/screen-draw";

export default async function Command() {
  await closeMainWindow();
  try {
    const isOpen = await toggleOverlay(environment.supportPath);
    if (!isOpen) {
      await showHUD("Drawing off");
    }
  } catch (error) {
    await showHUD(`Screen Draw failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
