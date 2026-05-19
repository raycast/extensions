import { useRSVPArticle } from "./hooks/useRSVPArticle";
import { RSVPReaderView } from "./views/RSVPReaderView";
import { getActiveTabUrl } from "./utils/browser-extension";
import { getFrontmostTabUrl } from "./utils/native-browser";
import { isValidUrl } from "./utils/url-resolver";
import { urlLog } from "./utils/logger";

async function resolveBrowserTabUrl(): Promise<{ url: string; source: string } | null> {
  urlLog.log("resolve:start", { source: "browser-tab-command" });

  const activeTab = await getActiveTabUrl();
  if (activeTab && isValidUrl(activeTab.url)) {
    urlLog.log("resolve:success", { source: "browser-extension", url: activeTab.url });
    return { url: activeTab.url, source: "browser-extension" };
  }

  const native = await getFrontmostTabUrl();
  if (native && isValidUrl(native.url)) {
    urlLog.log("resolve:success", { source: `applescript:${native.browser}`, url: native.url });
    return { url: native.url, source: `applescript:${native.browser}` };
  }

  urlLog.warn("resolve:failed", { reason: "no URL from browser-extension or AppleScript" });
  return null;
}

export default function Command() {
  const reader = useRSVPArticle({
    resolveUrl: resolveBrowserTabUrl,
    commandName: "open-current-tab",
  });

  return <RSVPReaderView {...reader} />;
}
