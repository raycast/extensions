import { closeMainWindow, getSelectedText } from "@raycast/api";
import checkForInstallation from "./utilities/checkForInstallation";
import { viewString } from "./utilities/jsa";

export default async function Command() {
  const isInstalled = await checkForInstallation();
  if (!isInstalled) {
    return;
  }
  const selectedText = await getSelectedText();
  viewString(selectedText);
  await closeMainWindow({ clearRootSearch: true });
}
