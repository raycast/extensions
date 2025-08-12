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
  } catch {
    await showHUD("❌ Failed opening a new Comet window");
  }
}
