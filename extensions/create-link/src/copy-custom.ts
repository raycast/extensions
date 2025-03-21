import { showHUD, Clipboard, getPreferenceValues, BrowserExtension } from "@raycast/api";
import { isExtensionInstalled, getActiveTab } from "./utils/browser";

interface CopyCustomFormatPreferences {
  customFormat: string;
}

function sanitizeUrl(url: string): string {
  try {
    new URL(url);
    return url;
  } catch {
    return "about:blank";
  }
}

function applyCustomTemplate(template: string, tab: BrowserExtension.Tab): string {
  const { url, title, id, favicon } = tab;
  const safeUrl = sanitizeUrl(url);
  const safeTitle = title || "";
  const safeFavicon = favicon || "";

  return template
    .replace(/\{url\}/g, safeUrl)
    .replace(/\{title\}/g, safeTitle)
    .replace(/\{id\}/g, String(id))
    .replace(/\{favicon\}/g, safeFavicon);
}

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

  const preferences = getPreferenceValues<CopyCustomFormatPreferences>();
  const { customFormat } = preferences;

  const customLink = applyCustomTemplate(customFormat, activeTab);

  await Clipboard.copy(customLink);
  await showHUD(`Copied HTML Link for "${activeTab.title || ""}" to clipboard`);
}
