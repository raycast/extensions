import { closeMainWindow, showHUD } from "@raycast/api";
import { createNewIncognitoWindow } from "./actions";
import { checkCometInstallation } from "./util";

export default async function Command() {
  const isInstalled = await checkCometInstallation();
  if (!isInstalled) {
    return;
  }

  try {
    await closeMainWindow();
    await createNewIncognitoWindow();
    await showHUD("✅ New Comet incognito window opened");
  } catch (error) {
    console.error("Failed to create new Comet incognito window:", error);
    await showHUD("❌ Failed opening a new Comet incognito window");
  }
}
