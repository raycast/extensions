import { closeMainWindow, showHUD } from "@raycast/api";
import { createNewIncognitoWindow } from "./lib/applescript";

export default async function Command() {
  try {
    await closeMainWindow();
    await createNewIncognitoWindow();
  } catch (error) {
    await showHUD("Failed to open a new Aside incognito window");
    console.error("open-new-incognito-window:", error);
  }
}
