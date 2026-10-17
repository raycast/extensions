import { closeMainWindow, showHUD } from "@raycast/api";
import { createNewWindow } from "./actions";
import { checkCometInstallation } from "./util";

export default async function Command() {
  const isInstalled = await checkCometInstallation();
  if (!isInstalled) {
    return;
  }

  try {
    await closeMainWindow();
    await createNewWindow();
    await showHUD("✅ New Comet window opened");
  } catch (error) {
    console.error("Failed to create new Comet window:", error);
    await showHUD("❌ Failed opening a new Comet window");
  }
}
