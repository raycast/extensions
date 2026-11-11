import { closeMainWindow, environment, showHUD } from "@raycast/api";
import { toggleRulers } from "swift:../swift/screen-align";

export default async function Command() {
  await closeMainWindow();
  try {
    const opened = await toggleRulers(environment.supportPath);
    await showHUD(opened ? "Rulers on — ↑ ↓ to align, esc when done" : "Rulers off");
  } catch (error) {
    await showHUD(`Screen Align: ${error instanceof Error ? error.message : String(error)}`);
  }
}
