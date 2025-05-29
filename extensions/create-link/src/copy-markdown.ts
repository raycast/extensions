import { showHUD, Clipboard } from "@raycast/api";
import { isExtensionInstalled, getActiveTab } from "./utils/browser";

function sanitizeForMarkdown(text: string): string {
  // Escape markdown special characters: [ ] ( ) ` * _ { } # + - . !
  return text.replace(/([[\]()"`*_{}\\#+\-.!])/g, "\\$1");
}

function sanitizeUrl(url: string): string {
  try {
    new URL(url);
    return url;
  } catch {
    return "about:blank";
  }
}

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
  const safeTitle = sanitizeForMarkdown(title || "");
  const safeUrl = sanitizeUrl(url);
  const markdownLink = `[${safeTitle}](${safeUrl})`;
  await Clipboard.copy(markdownLink);
  await showHUD(`Copied Markdown link for "${title || ""}" to clipboard`);
}
