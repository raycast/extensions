import { Action, ActionPanel, Icon, List, LocalStorage, showToast, Toast, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { dictionary, preferences } from "./utils/i18n";

interface IpInfo {
  status: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
  message?: string;
  timestamp?: number;
}

const STORAGE_KEY = "ip-history-v4";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [history, setHistory] = useState<IpInfo[]>([]);
  const lastProcessedQuery = useRef<string | null>(null);

  // Load history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const item = await LocalStorage.getItem<string>(STORAGE_KEY);
        if (item) {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed)) {
            setHistory(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to load history:", e);
      }
    }
    loadHistory();
  }, []);

  // 1. Fetch IP from myip.ipip.net (Source A - Step 1)
  const { data: myIp, isLoading: isMyIpLoading } = useFetch("http://myip.ipip.net", {
    execute: !searchText,
    headers: {
      "User-Agent": "curl/7.29.0",
    },
    parseResponse: async (response) => {
      const text = await response.text();
      const match = text.match(/IP[：:]\s*([0-9.]+)/);
      const isChina = text.includes("中国");
      return { ip: match ? match[1] : "", isChina };
    },
    keepPreviousData: true,
  });

  const language = preferences.language;
  const t = dictionary[language === "zh" ? "zh" : "en"];

  // 2. Fetch IP info using myip.ipip.net result (Source A - Step 2)
  const apiLang = language === "zh" ? "zh-CN" : "en";
  const { data: myIpInfo, isLoading: isMyIpInfoLoading } = useFetch<IpInfo>(
    `http://ip-api.com/json/${myIp?.ip}?lang=${apiLang}`,
    {
      execute: !searchText && !!myIp?.ip,
      keepPreviousData: true,
    },
  );

  // 3. Fetch IP info directly (Source B)
  const { data: directIpInfo, isLoading: isDirectIpInfoLoading } = useFetch<IpInfo>(
    `http://ip-api.com/json?lang=${apiLang}`,
    {
      execute: !searchText,
      keepPreviousData: true,
    },
  );

  // 4. Fetch IP info for Search
  const { data: searchIpInfo, isLoading: isSearchIpLoading } = useFetch<IpInfo>(
    `http://ip-api.com/json/${searchText}?lang=${apiLang}`,
    {
      execute: !!searchText,
      keepPreviousData: true,
    },
  );

  const isLoading =
    (!!searchText && isSearchIpLoading) ||
    (!searchText && (isMyIpLoading || isMyIpInfoLoading || isDirectIpInfoLoading));

  // Combined result for display
  const displayItems = (() => {
    if (searchText) {
      return searchIpInfo && searchIpInfo.status === "success" ? [searchIpInfo] : [];
    }

    const items: IpInfo[] = [];

    // Add myip based result
    if (myIpInfo && myIpInfo.status === "success") {
      items.push({ ...myIpInfo, message: "IPIP" });
    }

    // Add direct result if different
    if (directIpInfo && directIpInfo.status === "success") {
      // Deduplication: only add if query (IP) is different from the first one
      const alreadyExists = items.some((item) => item.query === directIpInfo.query);
      if (!alreadyExists) {
        items.push({ ...directIpInfo, message: "Local" });
      }
    }

    return items;
  })();

  // History management - only for search results to avoid cluttering history with auto-checks?
  // Or should we log what we see? The original requirement doesn't specify history changes,
  // but let's keep search history as the primary use case.
  // Actually, strictly speaking, the original code added `data` to history if it matched search text.
  // We'll keep that behavior for the SEARCH result.

  useEffect(() => {
    if (searchIpInfo && searchIpInfo.status === "success" && searchIpInfo.query === searchText) {
      if (lastProcessedQuery.current === searchIpInfo.query) {
        return;
      }

      const historyItem: IpInfo = {
        ...searchIpInfo,
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        const filtered = prev.filter((item) => item.query !== searchIpInfo.query);
        const newHistory = [historyItem, ...filtered].slice(0, 50);
        LocalStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory)).catch((e) => console.error("Save error:", e));
        return newHistory;
      });

      lastProcessedQuery.current = searchIpInfo.query;
    }
  }, [searchIpInfo, searchText]);

  // Save history helper
  const saveHistory = async (newHistory: IpInfo[]) => {
    setHistory(newHistory);
    try {
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save history:", e);
      await showToast({ style: Toast.Style.Failure, title: t.failedSaveHistory });
    }
  };

  const removeFromHistory = (query: string) => {
    const newHistory = history.filter((item) => item.query !== query);
    saveHistory(newHistory);
  };

  const clearHistory = () => {
    saveHistory([]);
  };

  const getMarkdown = (item: IpInfo | undefined) => {
    if (!item) {
      return "";
    }

    if (item.status === "fail") {
      return `## ${t.error}
${item.message || t.errorFetch}`;
    }

    const lat = item.lat || 0;
    const lon = item.lon || 0;
    const mapUrl = `https://static-maps.yandex.ru/1.x/?lang=en_US&ll=${lon},${lat}&z=10&l=map&size=600,300&pt=${lon},${lat},pm2rdm`;

    return `
![Map](${mapUrl})
`;
  };

  const getDetail = (item: IpInfo | undefined) => (
    <List.Item.Detail
      markdown={getMarkdown(item)}
      metadata={
        item && item.status === "success" ? (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title={t.ipAddress} text={item.query || ""} />
            <List.Item.Detail.Metadata.Label title={t.city} text={item.city || ""} />
            <List.Item.Detail.Metadata.Label title={t.region} text={item.regionName || ""} />
            <List.Item.Detail.Metadata.Label title={t.country} text={item.country || ""} />
            <List.Item.Detail.Metadata.Label title={t.isp} text={item.isp || ""} />
            <List.Item.Detail.Metadata.Label title={t.timezone} text={item.timezone || ""} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title={t.latitude} text={String(item.lat || 0)} />
            <List.Item.Detail.Metadata.Label title={t.longitude} text={String(item.lon || 0)} />
          </List.Item.Detail.Metadata>
        ) : null
      }
    />
  );

  const getActions = (item: IpInfo | undefined, isHistoryItem: boolean) => (
    <ActionPanel>
      {item && item.status === "success" && (
        <ActionPanel.Section>
          <Action.CopyToClipboard content={item.query || ""} title={t.copyIp} />
          <Action.CopyToClipboard content={JSON.stringify(item, null, 2)} title={t.copyJson} />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title={t.history}>
        {isHistoryItem && (
          <Action
            title={t.removeFromHistory}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => removeFromHistory(item!.query)}
          />
        )}
        <Action title={t.clearHistory} icon={Icon.Trash} style={Action.Style.Destructive} onAction={clearHistory} />
      </ActionPanel.Section>
    </ActionPanel>
  );

  const filteredHistory = history
    .filter((item) => item && item.query)
    .filter(
      (item) =>
        item.query.includes(searchText) ||
        (item.city || "").toLowerCase().includes(searchText.toLowerCase()) ||
        (item.regionName || "").toLowerCase().includes(searchText.toLowerCase()),
    );

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={t.searchPlaceholder}
      throttle
      selectedItemId={searchText ? "current-result" : undefined}
    >
      {/* Current Search/Sources Section */}
      {(searchText !== "" || displayItems.length > 0 || isLoading) && (
        <List.Section title={searchText ? t.searchResult : t.yourIp}>
          {displayItems.map((item, index) => (
            <List.Item
              key={item.query + index}
              title={item.query || t.unknownIp}
              subtitle=""
              accessories={[
                {
                  text: item.city || item.regionName || item.country || "",
                  tooltip:
                    [item.city, item.regionName, item.country].filter(Boolean).join(", ") +
                    (item.isp ? ` - ${item.isp}` : ""),
                },
                ...(item.message
                  ? [
                      {
                        tag: { value: item.message, color: Color.Blue },
                        tooltip:
                          item.message === "IPIP" ? t.viaIpip : item.message === "Local" ? t.viaLocal : undefined,
                      },
                    ]
                  : []),
              ]}
              icon={Icon.Globe}
              detail={getDetail(item)}
              actions={getActions(item, false)}
            />
          ))}
          {displayItems.length === 0 && isLoading && <List.Item title={t.fetching} icon={Icon.CircleProgress} />}
        </List.Section>
      )}

      {/* History Section */}
      <List.Section title={t.history}>
        {filteredHistory.map((item) => (
          <List.Item
            key={item.query}
            title={item.query || t.unknownIp}
            subtitle=""
            accessories={[
              {
                text: item.city || item.regionName || item.country || "",
                tooltip:
                  [item.city, item.regionName, item.country].filter(Boolean).join(", ") +
                  (item.isp ? ` - ${item.isp}` : ""),
              },
            ]}
            icon={Icon.Clock}
            detail={getDetail(item)}
            actions={getActions(item, true)}
          />
        ))}
      </List.Section>
    </List>
  );
}
