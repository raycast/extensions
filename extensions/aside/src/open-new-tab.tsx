import { closeMainWindow, showHUD } from "@raycast/api";
import { createNewTab } from "./lib/applescript";

export default async function Command() {
  try {
    await closeMainWindow();
    await createNewTab();
  } catch (error) {
    await showHUD("Failed to open a new Aside tab");
    console.error("open-new-tab:", error);
  }
}
