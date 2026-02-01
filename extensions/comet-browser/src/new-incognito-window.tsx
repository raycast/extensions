import { closeMainWindow, showHUD } from "@raycast/api";
import { createNewIncognitoWindow } from "./actions";

export default async function Command() {
  try {
    await closeMainWindow();
    await createNewIncognitoWindow();
  } catch {
    await showHUD("❌ Failed opening a new Comet incognito window");
  }
}
