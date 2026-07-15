import { Detail } from "@raycast/api";
import { BrowserTab } from "../types/browser";
import { BlockedPageActions } from "../actions/BlockedPageActions";
import { isWindows } from "../utils/host-api";

interface BlockedPageViewProps {
  blockedUrl: string;
  hasBrowserExtension: boolean;
  isWaitingForBrowser: boolean;
  foundTab: BrowserTab | null;
  onFetchFromBrowser: () => void;
}

/** The Refresh shortcut, written the way the reader's own keyboard is labelled. */
const REFRESH_KEYS = isWindows ? "Ctrl + R" : "⌘ + R";

function buildBlockedMarkdown(hasBrowserExtension: boolean, foundTab: BrowserTab | null): string {
  if (foundTab) {
    return `# Page Found in Browser

This page is already open in your browser${foundTab.title ? ` ("${foundTab.title}")` : ""}, but we couldn't fetch its content automatically.

**Press Enter** to switch to that tab, then press **${REFRESH_KEYS}** to fetch the content.

*The browser extension needs the tab to be active to read its content.*`;
  }

  if (hasBrowserExtension) {
    return `# Page Blocked

This website is preventing Raycast from downloading its content directly.

**To read this page:**
1. Press **Enter** or click the action below to open it in your browser
2. Wait for the page to fully load
3. Press **${REFRESH_KEYS}** to fetch the content via the Raycast browser extension

*The Raycast browser extension will be used to get the page content.*`;
  }

  // Raycast does not offer the browser extension on Windows, so pointing a Windows reader
  // at the install page is a dead end — there is nothing there for them to install.
  if (isWindows) {
    return `# Page Blocked

This website is preventing Raycast from downloading its content directly, and it requires the Raycast browser extension — which isn't available on Windows yet.

**To read this page**, open it in your browser and copy the article text, or try again later: some sites only block automated requests intermittently.`;
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
