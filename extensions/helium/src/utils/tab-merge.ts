import type { Tab } from "../types";
import type { HeliumTabRef } from "./applescript-parser";

interface FaviconTab {
  url: string;
  favicon?: string;
}

export function mergeAppleScriptTabsWithFavicons(asTabs: HeliumTabRef[], beTabs: FaviconTab[]): Tab[] {
  const faviconByUrl = new Map<string, string>();
  for (const t of beTabs) {
    if (t.favicon && !faviconByUrl.has(t.url)) faviconByUrl.set(t.url, t.favicon);
  }

  return asTabs.map((t) => ({
    id: t.heliumId,
    url: t.url,
    title: t.title || "",
    favicon: faviconByUrl.get(t.url),
  }));
}
