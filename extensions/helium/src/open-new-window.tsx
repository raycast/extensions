import { closeMainWindow, showHUD } from "@raycast/api";
import { createNewWindow } from "./utils/applescript";

export default async function Command() {
  try {
    await createNewWindow();
    await closeMainWindow();
  } catch (error) {
    await showHUD("Failed opening a new Helium window");
    console.error("Error opening new window:", error);
  }
}
