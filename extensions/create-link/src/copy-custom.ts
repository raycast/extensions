import { showHUD, Clipboard } from "@raycast/api";
import { isExtensionInstalled, getActiveTab } from "./utils/browser";
import { generateCustomTemplate } from "./utils/formatter";

export default async function copyCustom() {
  if (!isExtensionInstalled()) {
    await showHUD("Extension not installed");
    return;
  }

  const activeTab = await getActiveTab();
  if (activeTab === undefined) {
    await showHUD("No active tab found");
    return;
  }

  const customLink = generateCustomTemplate(activeTab);

  await Clipboard.copy(customLink);
  await showHUD(`Copied Custom Link for "${activeTab.title || ""}" to clipboard`);
}
