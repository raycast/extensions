import { Detail } from "@raycast/api";
import { useArticleReader } from "./hooks/useArticleReader";
import { ArticleReaderView } from "./views/ArticleReaderView";
import { getActiveTabUrl } from "./utils/browser-extension";
import { hasBrowserExtension, isWindows } from "./utils/host-api";
import { isValidUrl } from "./utils/url-resolver";
import { urlLog } from "./utils/logger";

async function resolveBrowserTabUrl(): Promise<{ url: string; source: string } | null> {
  urlLog.log("resolve:start", { source: "browser-tab-command" });

  const activeTab = await getActiveTabUrl();
  if (activeTab && isValidUrl(activeTab.url)) {
    urlLog.log("resolve:success", { source: "browser", url: activeTab.url, tabId: activeTab.tabId });
    return { url: activeTab.url, source: "browser" };
  }
  urlLog.log("resolve:skip", { source: "browser", reason: "no active tab with valid URL or extension unavailable" });

  urlLog.warn("resolve:failed", { reason: "no valid URL found from browser tab" });
  return null;
}

/**
 * Explains why this command cannot work, rather than letting it fail as a mystified
 * "no valid URL found" — this command is nothing but a browser-extension call, so without
 * the extension there is no version of it that does anything.
 */
function UnavailableView() {
  const reason = isWindows
    ? "The Raycast browser extension isn't available on Windows yet, and this command depends on it entirely."
    : "This command reads the URL from your frontmost browser tab, which needs the Raycast browser extension.";

  const remedy = isWindows
    ? "Use **Open Reader Mode** and paste a URL, or copy the page's address and run **Open Clipboard in Reader Mode**."
    : "Install the [Raycast browser extension](https://www.raycast.com/browser-extension), or use **Open Reader Mode** and paste a URL instead.";

  return <Detail markdown={`# Browser Extension Required\n\n${reason}\n\n${remedy}`} />;
}

/** Split out so the reader hook — and the fetch it starts on mount — never runs without a browser. */
function CurrentTabReader() {
  const reader = useArticleReader({
    resolveUrl: resolveBrowserTabUrl,
    commandName: "open-current-tab",
  });

  return <ArticleReaderView {...reader} />;
}

export default function Command() {
  if (!hasBrowserExtension()) {
    return <UnavailableView />;
  }

  return <CurrentTabReader />;
}
