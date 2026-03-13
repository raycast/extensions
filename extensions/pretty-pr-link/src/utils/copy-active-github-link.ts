import { BrowserExtension, Clipboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

interface CopyActiveGithubLinkProps {
  prefix: string | null;
}

export async function copyActiveGithubLink({
  prefix = null,
}: CopyActiveGithubLinkProps) {
  const openTabs = await BrowserExtension.getTabs();
  const activeTab = openTabs.find((tab) => tab.active);

  if (!activeTab) {
    await showFailureToast("No active tab found");
    return;
  }

  if (!activeTab.url.includes("github.com")) {
    await showFailureToast("The active tab is not a GitHub page");
    return;
  }

  const prTitle = await BrowserExtension.getContent({
    tabId: activeTab.id,
    format: "text",
    cssSelector: ".js-issue-title.markdown-title",
  });

  const formattedLink = `${prefix ? `${prefix} ` : ""}[${prTitle}](${activeTab.url})`;
  await Clipboard.copy(formattedLink);

  await showHUD("Copied formatted link to clipboard 🥳");
}
