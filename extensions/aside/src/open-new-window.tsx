import { closeMainWindow, showHUD } from "@raycast/api";
import { createNewWindow } from "./lib/applescript";

export default async function Command() {
  try {
    await closeMainWindow();
    await createNewWindow();
  } catch (error) {
    await showHUD("Failed to open a new Aside window");
    console.error("open-new-window:", error);
  }
}
