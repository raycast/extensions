import { closeMainWindow, open } from "@raycast/api";
import { checkMindnodeInstallation } from "./utils/checkInstall";

export default async function Command() {
  const isInstalled = await checkMindnodeInstallation();
  if (!isInstalled) {
    return;
  }

  const url = "mindnode://newDocument?type=mindMap";
  await closeMainWindow();
  open(url);
}
