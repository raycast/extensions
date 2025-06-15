import { closeMainWindow, open } from "@raycast/api";
import { checkMindnodeInstallation } from "./utils/checkInstall";

export default async function main() {
  const isInstalled = await checkMindnodeInstallation();
  if (!isInstalled) {
    return;
  }

  const url = "mindnode://quickEntry?clearExisting='false?'";
  await closeMainWindow();
  open(url);
}
