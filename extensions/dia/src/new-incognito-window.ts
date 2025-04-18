import { closeMainWindow, showHUD } from "@raycast/api";
import { createNewIncognitoWindow } from "./scripts";

export default async function Command() {
  try {
    await closeMainWindow();
    await createNewIncognitoWindow();
  } catch {
    await showHUD("❌ Failed opening a new incognito window");
  }
}
