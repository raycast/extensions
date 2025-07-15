import { showHUD, Clipboard } from "@raycast/api";
import { isExtensionInstalled, getActiveTab } from "./utils/browser";
import { generateHTML } from "./utils/formatter";

export default async function copyHTML() {
  if (!isExtensionInstalled()) {
    await showHUD("Extension not installed");
    return;
  }

  const activeTab = await getActiveTab();
  if (activeTab === undefined) {
    await showHUD("No active tab found");
    return;
  }

  const htmlLink = generateHTML(activeTab);
  await Clipboard.copy(htmlLink);
  await showHUD(`Copied HTML Link for "${activeTab.title || ""}" to clipboard`);
}
