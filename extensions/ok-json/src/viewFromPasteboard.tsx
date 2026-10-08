import { closeMainWindow, open } from "@raycast/api";
import checkForInstallation from "./utilities/checkForInstallation";

export default async function Command() {
  const isInstalled = await checkForInstallation();
  if (!isInstalled) {
    return;
  }
  open("okjson://paste");
  await closeMainWindow({ clearRootSearch: true });
}
