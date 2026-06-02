import { Icon, Color, Image, getPreferenceValues } from "@raycast/api";
import { useState, useRef, useEffect, useMemo } from "react";

import { SearchResult } from "../utils/searchTypes";

const ICONS = {
  Static: { source: Icon.ArrowRightCircleFilled, tintColor: Color.Green },
  Lucky: { source: Icon.Brush, tintColor: Color.Magenta },
  Navigation: { source: Icon.Globe, tintColor: Color.Green },
  Search: { source: Icon.MagnifyingGlass, tintColor: Color.Blue },
};

export function useSearch(externalSearchText?: string) {
  const [searchText, setSearchText] = useState(externalSearchText || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (externalSearchText !== undefined) {
      setSearchText(externalSearchText);
    }
  }, [externalSearchText]);

  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const cancelRef = useRef<AbortController | null>(null);

  const { luckyProvider, showSearchImages } = useMemo(() => getPreferenceValues<Preferences.TabSwitch>(), []);

  // --- STATIC RESULT (Top Item) ---
  // V-CORE: 0ms Latency Static Item. This ensures the 'Enter' action is ALWAYS ready
  // the millisecond you finish a keystroke, regardless of network suggestions.
  const results = useMemo(() => {
    const query = searchText;
    const trimmed = query.trim();
    if (!trimmed) return [];

    const isLucky = query.startsWith(" ");
    const actualQuery = isLucky ? query.substring(1).trim() : trimmed;
    let url = "";

    const isUrl =
      /^(https?:\/\/|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/|$)|localhost(?::\d+)?(?:\/|$)|(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:\/|$))/.test(
        actualQuery,
      ) && !actualQuery.includes(" ");

    if (isUrl) {
      url =
        actualQuery.startsWith("http://") || actualQuery.startsWith("https://")
          ? actualQuery
          : `https://${actualQuery}`;
    } else if (isLucky && luckyProvider === "duckduckgo") {
      url = `https://duckduckgo.com/?q=${encodeURIComponent("! " + actualQuery)}`;
    } else {
      const searchUrl = new URL("https://www.google.com/search");
      searchUrl.searchParams.set("q", actualQuery);
      if (isLucky) searchUrl.searchParams.set("btnI", "1");
      url = searchUrl.toString();
    }

    const staticResult: SearchResult = {
      id: "static-result",
      query: actualQuery,
      description: isUrl
        ? `Open URL`
        : isLucky
          ? `Lucky Search (${luckyProvider === "duckduckgo" ? "DuckDuckGo" : "Google"})`
          : "Search Google",
      url: url,
      icon: isUrl ? ICONS.Navigation : isLucky ? ICONS.Lucky : ICONS.Static,
      isHistory: false,
    };

    return [staticResult, ...suggestions];
  }, [searchText, suggestions, luckyProvider]);

  // --- API FETCH (Progressive Streaming Architecture) ---
  useEffect(() => {
    // V-CORE: Only clear suggestions if the RAW search text is empty.
    if (!searchText.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const query = searchText.trim();
    if (!query) return;

    const isLucky = searchText.startsWith(" ");
    const actualQuery = (isLucky ? searchText.substring(1).trim() : query).toLowerCase();

    setIsLoading(true);
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    const signal = cancelRef.current.signal;

    async function fetchSuggestions() {
      const timeoutId = setTimeout(() => cancelRef.current?.abort(), 3000);

      try {
        // FAST PHASE: Instantly fetch the blazing-fast text endpoint
        // node-fetch supports the custom `agent` option to reuse the TLS context
        const respChrome = await fetch(
          `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(actualQuery)}`,
          {
            method: "get",
            signal,
          } as RequestInit & { timeout?: number },
        );

        const jsonChrome = (await respChrome.json()) as [
          string,
          string[],
          unknown[],
          unknown[],
          (Record<string, unknown> & { "google:suggesttype"?: string[] })?,
        ];
        const chromeSuggestions = jsonChrome[1] || [];
        const chromeMeta = jsonChrome[4] || {};
        const chromeTypes = chromeMeta["google:suggesttype"] || [];

        // Transform base suggestions
        let baseSuggestions: SearchResult[] = chromeSuggestions.map((item: string, index: number) => {
          const type = chromeTypes[index];
          const isNavigation = type === "NAVIGATION";
          let itemUrl = isNavigation ? item : `https://www.google.com/search?q=${encodeURIComponent(item)}`;

          if (isLucky && !isNavigation) {
            itemUrl =
              luckyProvider === "duckduckgo"
                ? `https://duckduckgo.com/?q=${encodeURIComponent("! " + item)}`
                : `https://www.google.com/search?q=${encodeURIComponent(item)}&btnI=1`;
          }

          return {
            id: item,
            query: item,
            description: undefined,
            url: itemUrl,
            icon: isLucky ? ICONS.Lucky : isNavigation ? ICONS.Navigation : ICONS.Search,
            isNavigation,
          };
        });

        // Deduplicate
        baseSuggestions = baseSuggestions.filter(
          (v: SearchResult, i: number, a: SearchResult[]) => a.findIndex((t) => t.id === v.id) === i,
        );
        // Limit suggestions to a reasonable number to keep UI snappy
        baseSuggestions = baseSuggestions.slice(0, 10);

        if (!signal.aborted) {
          setSuggestions(baseSuggestions);
          setIsLoading(false);
        }

        // BACKGROUND PHASE: If images enabled, asynchronously fetch heavy entity data and patch the UI
        if (showSearchImages && !signal.aborted) {
          const respGws = await fetch(
            `https://suggestqueries.google.com/complete/search?client=gws-wiz&q=${encodeURIComponent(actualQuery)}`,
            {
              method: "get",
              signal,
            } as RequestInit & { timeout?: number },
          );

          const textGws = await respGws.text();
          const jsonStrGws = textGws.replace("window.google.ac.h(", "").replace(/\)$/, "");
          const dataGws = JSON.parse(jsonStrGws);
          const gwsSuggestions = (dataGws[0] || []) as unknown[];

          interface GwsEntityMeta {
            zi?: string;
            zs?: string;
            zh?: string;
          }

          const entityMap = new Map<string, GwsEntityMeta>();
          gwsSuggestions.forEach((itemVal: unknown) => {
            const item = itemVal as [string, number, number[], GwsEntityMeta];
            const q = (item[0] || "").replace(/<b>|<\/b>/g, "");
            entityMap.set(q.toLowerCase(), item[3]);
          });

          if (entityMap.size > 0 && !signal.aborted) {
            // Hot-patch the existing suggestions with Rich UI metadata seamlessly
            setSuggestions((prev) =>
              prev.map((s) => {
                const entityMeta = entityMap.get(s.id.toLowerCase());
                if (!entityMeta) return s;

                let repIcon = s.icon;
                let repDesc = s.description;
                let repQuery = s.query;

                if (entityMeta.zi) repDesc = entityMeta.zi;
                if (entityMeta.zs && !isLucky) repIcon = { source: entityMeta.zs, mask: Image.Mask.RoundedRectangle };
                if (entityMeta.zh) repQuery = entityMeta.zh;

                return { ...s, query: repQuery, description: repDesc, icon: repIcon };
              }),
            );
          }
        }
      } catch (e) {
        if (e instanceof Error && (e.name === "AbortError" || e.message.toLowerCase().includes("timeout"))) {
          // Ignore timeouts/aborts to keep the UI responsive and prevent proxy crashes
          return;
        }
        setIsLoading(false);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    fetchSuggestions();
    return () => cancelRef.current?.abort();
  }, [searchText, luckyProvider, showSearchImages]);

  return { isLoading, results, searchText, setSearchText };
}
