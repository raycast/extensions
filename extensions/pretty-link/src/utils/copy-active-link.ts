import { BrowserExtension, Clipboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

type LinkSource = "github" | "plain";

interface CopyActiveLinkProps {
  githubPrefix: string | null;
  plainPrefix: string | null;
}

interface LinkConfig {
  source: LinkSource;
  domain: string;
  cssSelector: string;
  errorMessage: string;
}

const LINK_CONFIGS: LinkConfig[] = [
  {
    source: "github",
    domain: "github.com",
    cssSelector: ".js-issue-title.markdown-title",
    errorMessage: "Could not find the PR title",
  },
  {
    source: "plain",
    domain: "app.plain.com",
    cssSelector: "[data-testid='thread-header']",
    errorMessage: "Could not find the thread title",
  },
];

function extractPlainThreadTitle(headerText: string): string | null {
  const lines = headerText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  for (const line of lines) {
    if (!line.startsWith("T-") && !line.startsWith("via") && line.length > 10) {
      return line;
    }
  }

  return null;
}

export async function copyActiveLink({
  githubPrefix = null,
  plainPrefix = null,
}: CopyActiveLinkProps) {
  const openTabs = await BrowserExtension.getTabs();
  const activeTab = openTabs.find((tab) => tab.active);

  if (!activeTab) {
    await showFailureToast("No active tab found");
    return;
  }

  const config = LINK_CONFIGS.find((c) => activeTab.url.includes(c.domain));

  if (!config) {
    await showFailureToast("The active tab is not a GitHub or Plain page");
    return;
  }

  const rawContent = await BrowserExtension.getContent({
    tabId: activeTab.id,
    format: "text",
    cssSelector: config.cssSelector,
  });

  if (!rawContent) {
    await showFailureToast(config.errorMessage);
    return;
  }

  const title =
    config.source === "plain"
      ? extractPlainThreadTitle(rawContent)
      : rawContent.trim();

  if (!title) {
    await showFailureToast(config.errorMessage);
    return;
  }

  const prefix = config.source === "github" ? githubPrefix : plainPrefix;
  const formattedLink = `${prefix ? `${prefix} ` : ""}[${title}](${activeTab.url})`;
  await Clipboard.copy(formattedLink);

  await showHUD("Copied formatted link to clipboard");
}
