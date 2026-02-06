import { Detail } from "@raycast/api";
import { BrowserTab } from "../types/browser";
import { BlockedPageActions } from "../actions/BlockedPageActions";

interface BlockedPageViewProps {
  blockedUrl: string;
  hasBrowserExtension: boolean;
  isWaitingForBrowser: boolean;
  foundTab: BrowserTab | null;
  onFetchFromBrowser: () => void;
}

function buildBlockedMarkdown(hasBrowserExtension: boolean, foundTab: BrowserTab | null): string {
  if (foundTab) {
    return `# Page Found in Browser

This page is already open in your browser${foundTab.title ? ` ("${foundTab.title}")` : ""}, but we couldn't fetch its content automatically.

**Press Enter** to switch to that tab, then press **⌘ + R** to fetch the content.

*The browser extension needs the tab to be active to read its content.*`;
  }

  if (hasBrowserExtension) {
    return `# Page Blocked

This website is preventing Raycast from downloading its content directly.

**To read this page:**
1. Press **Enter** or click the action below to open it in your browser
2. Wait for the page to fully load
3. Press **⌘ + R** to fetch the content via the Raycast browser extension

*The Raycast browser extension will be used to get the page content.*`;
  }

  return `# Page Blocked

This website is preventing Raycast from downloading its content directly.

**To read this page**, install the [Raycast browser extension](https://www.raycast.com/browser-extension) and try again.

Once installed, you'll be able to open blocked pages in your browser and fetch their content through the extension.`;
}

export function BlockedPageView({
  blockedUrl,
  hasBrowserExtension,
  isWaitingForBrowser,
  foundTab,
  onFetchFromBrowser,
}: BlockedPageViewProps) {
  const markdown = buildBlockedMarkdown(hasBrowserExtension, foundTab);

  return (
    <Detail
      markdown={markdown}
      isLoading={isWaitingForBrowser}
      actions={
        <BlockedPageActions
          blockedUrl={blockedUrl}
          hasBrowserExtension={hasBrowserExtension}
          foundTab={foundTab}
          onFetchFromBrowser={onFetchFromBrowser}
        />
      }
    />
  );
}
