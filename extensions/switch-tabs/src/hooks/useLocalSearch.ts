import { useMemo } from "react";
import { Icon, Color } from "@raycast/api";
import { SearchResult } from "../utils/searchTypes";

interface BrowserPage {
  id: string;
  query: string;
  description: string;
  url: string;
  icon: Icon;
  keywords: string[];
}

const getBrowserPages = (browserTarget: string): BrowserPage[] => {
  // Map friendly names to internal protocols and search names
  const browserMap: Record<string, { protocol: string; name: string }> = {
    chrome: { protocol: "chrome://", name: "Chrome" },
    brave: { protocol: "brave://", name: "Brave" },
    edge: { protocol: "edge://", name: "Edge" },
    helium: { protocol: "helium://", name: "Helium" },
  };

  const target = browserTarget?.toLowerCase() || "edge";
  const { protocol, name } = browserMap[target] || browserMap.edge;

  return [
    {
      id: `${name.toLowerCase()}-settings`,
      query: `${name} Settings`,
      description: "Browser Configuration & Themes",
      url: `${protocol}settings`,
      icon: Icon.Gear,
      keywords: ["config", "pref", "theme", "setup", "options"],
    },
    {
      id: `${name.toLowerCase()}-history`,
      query: `${name} History`,
      description: "Recently Visited Pages",
      url: `${protocol}history`,
      icon: Icon.Clock,
      keywords: ["recent", "past", "visited"],
    },
    {
      id: `${name.toLowerCase()}-downloads`,
      query: `${name} Downloads`,
      description: "Managing Downloaded Files",
      url: `${protocol}downloads`,
      icon: Icon.Download,
      keywords: ["files", "saved"],
    },
    {
      id: `${name.toLowerCase()}-extensions`,
      query: `${name} Extensions`,
      description: "Browser Add-ons & Plugins",
      url: `${protocol}extensions`,
      icon: Icon.Box,
      keywords: ["plugins", "addons", "manage"],
    },
    {
      id: `${name.toLowerCase()}-flags`,
      query: `${name} Flags`,
      description: "Experimental Browser Features",
      url: `${protocol}flags`,
      icon: Icon.Megaphone,
      keywords: ["experimental", "labs", "beta"],
    },
    {
      id: `${name.toLowerCase()}-bookmarks`,
      query: `${name} Bookmarks`,
      description: "Managing Saved Pages",
      url: `${protocol}bookmarks`,
      icon: Icon.Star,
      keywords: ["fav", "saved"],
    },
    {
      id: `${name.toLowerCase()}-components`,
      query: `${name} Components`,
      description: "Individual Component Updates",
      url: `${protocol}components`,
      icon: Icon.HardDrive,
      keywords: ["update", "module"],
    },
    {
      id: `${name.toLowerCase()}-sync`,
      query: `${name} Sync`,
      description: "Internal Sync Diagnostics",
      url: `${protocol}sync-internals`,
      icon: Icon.RotateClockwise,
      keywords: ["sync", "cloud", "diagnostics"],
    },
    {
      id: `${name.toLowerCase()}-version`,
      query: `${name} Version`,
      description: "Browser Details & Updates",
      url: `${protocol}version`,
      icon: Icon.Info,
      keywords: ["about", "update", "details"],
    },
  ];
};

export function useLocalSearch(searchText: string, searchResults: SearchResult[], browserTarget: string) {
  const finalSearchResults = useMemo(() => {
    if (!searchText) return searchResults;
    const lowerSearchText = searchText.toLowerCase();
    const isSpecialTrigger = lowerSearchText.startsWith("!");
    const cleanSearchText = isSpecialTrigger ? lowerSearchText.substring(1).trim() : lowerSearchText;

    // 1. Find matching browser pages
    const browserPages = getBrowserPages(browserTarget);
    const browserPageMatches = browserPages
      .map((page: BrowserPage) => {
        const lowerPageQuery = page.query.toLowerCase();
        const lowerPageUrl = page.url.toLowerCase();
        let score = 0;

        if (lowerPageQuery === cleanSearchText) score += 20;
        else if (lowerPageQuery.startsWith(cleanSearchText)) score += 15;
        else if (lowerPageQuery.includes(cleanSearchText)) score += 10;
        else if (lowerPageUrl.includes(cleanSearchText)) score += 5;
        else if (page.keywords.some((k: string) => k === cleanSearchText)) score += 12;
        else if (page.keywords.some((k: string) => k.startsWith(cleanSearchText))) score += 8;
        else if (page.keywords.some((k: string) => k.includes(cleanSearchText))) score += 5;

        return { ...page, score };
      })
      .filter((p: BrowserPage & { score: number }) => p.score > 0 || (isSpecialTrigger && !cleanSearchText))
      .sort((a: BrowserPage & { score: number }, b: BrowserPage & { score: number }) => b.score - a.score);

    // Only show browser pages in normal search if we have 3+ characters or it's a special trigger
    const hasEnoughInput = cleanSearchText.length >= 3;
    const shouldShowForNormal = !isSpecialTrigger && hasEnoughInput;

    const matchedBrowserPages = (
      isSpecialTrigger || shouldShowForNormal
        ? isSpecialTrigger
          ? browserPageMatches
          : browserPageMatches.slice(0, 1)
        : []
    ).map((page: BrowserPage & { score: number }) => ({
      ...page,
      icon: { source: page.icon, tintColor: Color.Green },
      isLocalPage: true,
    }));

    // 3. Assemble results strictly ordered: [Google Search, Browser Pages, Google Results]
    const combinedResults = [...searchResults];

    // Inject Chrome/Edge internal pages (Settings, Flags, etc.)
    if (matchedBrowserPages.length > 0) {
      combinedResults.splice(1, 0, ...(matchedBrowserPages as unknown as SearchResult[]));
    }

    return combinedResults;
  }, [searchResults, searchText, browserTarget]);

  return { finalSearchResults };
}
