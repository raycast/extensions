import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  getPreferenceValues,
  Cache,
} from "@raycast/api";
import { useEffect, useState, useCallback, useRef } from "react";
import { XMLParser } from "fast-xml-parser";
import { SecurityItem, Category, OPMLFeed } from "./types";
import { parseOPML, fetchOPMLFromURL, getBuiltinFeeds } from "./opml";
import { categorizeItem, mergeCVEItems } from "./utils";
import SummaryView from "./Summary";

const cache = new Cache();
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  textNodeName: "_text",
});

const CATEGORY_ICONS: Record<Category, Icon> = {
  vulnerability: Icon.Bug,
  intelligence: Icon.LightBulb,
  news: Icon.Text,
};

const CATEGORY_COLORS: Record<Category, Color> = {
  vulnerability: Color.Red,
  intelligence: Color.Orange,
  news: Color.Green,
};

const CATEGORY_LABELS: Record<Category, string> = {
  vulnerability: "🛡️ Vulnerability",
  intelligence: "🔥 Intelligence",
  news: "📰 News",
};

export default function DailyDigest() {
  const [items, setItems] = useState<SecurityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">(
    "all",
  );
  const isFetchingRef = useRef(false);

  const preferences = getPreferenceValues();

  const fetchFeeds = useCallback(async () => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      let feeds: OPMLFeed[] = [];

      // Try to fetch OPML from URL if configured
      if (preferences.opmlUrl) {
        try {
          const opmlContent = await fetchOPMLFromURL(preferences.opmlUrl);
          feeds = parseOPML(opmlContent);
        } catch (e) {
          console.error("Failed to fetch OPML from URL:", e);
        }
      }

      // Fallback to built-in feeds
      if (feeds.length === 0) {
        feeds = getBuiltinFeeds();
      }

      // Fetch RSS items from all feeds
      const allItems: SecurityItem[] = [];
      const selectedFeeds = feeds.slice(0, preferences.maxFeeds || 20);
      const CHUNK_SIZE = 5;

      // Pre-calculate cutoff time
      const hoursAgo = preferences.hoursBack || 24;
      const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

      for (let i = 0; i < selectedFeeds.length; i += CHUNK_SIZE) {
        const chunk = selectedFeeds.slice(i, i + CHUNK_SIZE);
        const results = await Promise.all(
          chunk.map(async (feed) => {
            try {
              const response = await fetch(feed.url, {
                headers: {
                  "User-Agent": "security-digest/1.0",
                },
              });
              if (!response.ok) {
                return [];
              }
              let xmlData: string | null = await response.text();
              const parsed = xmlParser.parse(xmlData);
              xmlData = null;

              const feedItems: SecurityItem[] = [];
              let parsedItems = [];
              if (parsed.rss && parsed.rss.channel && parsed.rss.channel.item) {
                parsedItems = Array.isArray(parsed.rss.channel.item)
                  ? parsed.rss.channel.item
                  : [parsed.rss.channel.item];
              } else if (parsed.feed && parsed.feed.entry) {
                parsedItems = Array.isArray(parsed.feed.entry)
                  ? parsed.feed.entry
                  : [parsed.feed.entry];
              }

              for (const item of parsedItems) {
                const dateStr = item.pubDate || item.published || item.updated;
                const pubDate = dateStr ? new Date(dateStr) : new Date();
                if (pubDate >= cutoff) {
                  const title = item.title?._text || item.title || "Untitled";
                  const link =
                    item.link?._text ||
                    item.link?.["@_href"] ||
                    item.link ||
                    "";
                  const content =
                    item.description?._text ||
                    item.description ||
                    item.content?._text ||
                    item.summary?._text ||
                    "";

                  feedItems.push({
                    title: String(title),
                    link: String(link),
                    content:
                      String(content).substring(0, 500) +
                      (content.length > 500 ? "..." : ""),
                    pubDate,
                    source: feed.title,
                    sourceUrl: feed.url,
                    category: categorizeItem(String(title), String(content)),
                  });
                }
              }
              return feedItems;
            } catch (e) {
              console.error(`Failed to fetch feed ${feed.url}:`, e);
              return [];
            }
          }),
        );
        results.forEach((items) => allItems.push(...items));
      }

      // Merge CVE items
      const mergedItems = mergeCVEItems(allItems);

      // Sort by date
      mergedItems.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

      // Limit results
      const limitedItems = mergedItems.slice(0, preferences.maxItems || 50);

      setItems(limitedItems);
      cache.set("last_fetch", new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch feeds");
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: e instanceof Error ? e.message : "Failed to fetch feeds",
      });
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [preferences]);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  const filteredItems =
    selectedCategory === "all"
      ? items
      : items.filter((item) => item.category === selectedCategory);

  const categories: (Category | "all")[] = [
    "all",
    "vulnerability",
    "intelligence",
    "news",
  ];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search security news..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by category"
          storeValue={true}
          onChange={(value) => setSelectedCategory(value as Category | "all")}
        >
          {categories.map((cat) => (
            <List.Dropdown.Item
              key={cat}
              title={cat === "all" ? "📦 All" : CATEGORY_LABELS[cat]}
              value={cat}
            />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load feeds"
          description={error}
        />
      ) : filteredItems.length === 0 ? (
        <List.EmptyView
          icon={Icon.Text}
          title="No news found"
          description="Try adjusting your time window or check your feeds"
        />
      ) : (
        <List.Section
          title={`${filteredItems.length} items`}
          subtitle={`Last ${preferences.hoursBack || 24}h`}
        >
          {filteredItems.map((item, index) => (
            <List.Item
              key={`${item.link}-${index}`}
              title={item.title}
              subtitle={item.source}
              icon={{
                source: CATEGORY_ICONS[item.category],
                tintColor: CATEGORY_COLORS[item.category],
              }}
              accessories={[
                { text: getCategoryLabel(item.category) },
                { date: item.pubDate },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Stars}
                    title="Summarize with AI"
                    target={<SummaryView item={item} />}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                  <Action.OpenInBrowser
                    url={item.link}
                    title="Open in Browser"
                  />
                  <Action.CopyToClipboard
                    content={`[${item.title}](${item.link})`}
                    title="Copy Markdown Link"
                  />
                  <Action.CopyToClipboard
                    content={item.link}
                    title="Copy URL"
                  />
                  <Action
                    icon={Icon.ArrowClockwise}
                    title="Refresh"
                    onAction={fetchFeeds}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function getCategoryLabel(category: Category): string {
  const labels: Record<Category, string> = {
    vulnerability: "CVE",
    intelligence: "Intel",
    news: "News",
  };
  return labels[category];
}
