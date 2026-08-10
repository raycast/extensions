import { closeMainWindow, showHUD } from "@raycast/api";
import { createNewIncognitoWindow } from "./utils/applescript";

export default async function Command() {
  try {
    await createNewIncognitoWindow();
    await closeMainWindow();
  } catch (error) {
    await showHUD("Failed opening a new Helium incognito window");
    console.error("Error opening new incognito window:", error);
  }
}
