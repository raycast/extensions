import { closeMainWindow, showHUD } from "@raycast/api";
import { createNewTab } from "./utils/browser-control";

export default async function Command() {
  try {
    await createNewTab();
    await closeMainWindow();
  } catch (error) {
    await showHUD("Failed opening a new Helium tab");
    console.error("Error opening new tab:", error);
  }
}
