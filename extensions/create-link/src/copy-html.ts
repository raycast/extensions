import { showHUD, Clipboard } from "@raycast/api";
import { isExtensionInstalled, getActiveTab } from "./utils/browser";

function sanitizeForHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeUrl(url: string): string {
  try {
    new URL(url);
    return url;
  } catch {
    return "about:blank";
  }
}

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
  const safeTitle = sanitizeForHtml(title || "");
  const safeUrl = sanitizeUrl(url);
  const htmlLink = `<a href="${safeUrl}">${safeTitle}</a>`;
  await Clipboard.copy(htmlLink);
  await showHUD(`Copied HTML Link for "${title || ""}" to clipboard`);
}
