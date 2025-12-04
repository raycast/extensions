import { BrowserExtension, Clipboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

interface CopyActivePlainLinkProps {
  prefix: string | null;
}

export async function copyActivePlainLink({
  prefix = null,
}: CopyActivePlainLinkProps) {
  const openTabs = await BrowserExtension.getTabs();
  const activeTab = openTabs.find((tab) => tab.active);

  if (!activeTab) {
    await showFailureToast("No active tab found");
    return;
  }

  if (!activeTab.url.includes("app.plain.com")) {
    await showFailureToast("The active tab is not a Plain thread");
    return;
  }

  const threadHeaderText = await BrowserExtension.getContent({
    tabId: activeTab.id,
    format: "text",
    cssSelector: "[data-testid='thread-header']",
  });

  // Extract the title from the header text
  // The structure includes: thread ID, title, and "via [channel]" text
  // We need to extract just the title part
  const lines = threadHeaderText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  // Find the title line - it's typically the longest line that's not "via" or the thread ID
  let threadTitle = "";
  for (const line of lines) {
    if (!line.startsWith("T-") && !line.startsWith("via") && line.length > 10) {
      threadTitle = line;
      break;
    }
  }

  if (!threadTitle) {
    await showFailureToast("Could not extract thread title");
    return;
  }

  const formattedLink = `${prefix ? `${prefix} ` : ""}[${threadTitle}](${activeTab.url})`;
  await Clipboard.copy(formattedLink);

  await showHUD("Copied formatted link to clipboard 🥳");
}
