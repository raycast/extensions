import { showHUD, Clipboard } from "@raycast/api";
import { isExtensionInstalled, getActiveTab } from "./utils/browser";

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

  const { url, title } = activeTab;
  const htmlLink = `<a href="${url}">${title}</a>`;
  await Clipboard.copy(htmlLink);
  await showHUD(`Copied HTML Link for "${title}" to clipboard`);
}
