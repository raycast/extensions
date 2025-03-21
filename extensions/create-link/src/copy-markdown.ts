import { showHUD, Clipboard } from "@raycast/api";
import { isExtensionInstalled, getActiveTab } from "./utils/browser";
import { generateMarkdown } from "./utils/formatter";

export default async function copyMarkdown() {
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
  const markdownLink = generateMarkdown(title || "", url);
  await Clipboard.copy(markdownLink);
  await showHUD(`Copied Markdown link for "${title || ""}" to clipboard`);
}
