import { useArticleReader } from "./hooks/useArticleReader";
import { ArticleReaderView } from "./views/ArticleReaderView";
import { getActiveTabUrl } from "./utils/browser-extension";
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

export default function Command() {
  const reader = useArticleReader({
    resolveUrl: resolveBrowserTabUrl,
    commandName: "open-current-tab",
  });

  return <ArticleReaderView {...reader} />;
}
