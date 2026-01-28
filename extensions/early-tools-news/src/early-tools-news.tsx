import { Action, ActionPanel, List, showToast, Toast, Image, Icon } from "@raycast/api";
import { useState } from "react";
import Parser from "rss-parser";
import { useCachedPromise } from "@raycast/utils";

const parser = new Parser();

const feedURLs = [
  "https://feed.informer.com/digests/0SYH5PPNPD/feeder.rss",
  "https://feed.informer.com/digests/PY09VDLVRF/feeder.rss",
  "https://feed.informer.com/digests/OL5GPXO2BT/feeder.rss",
];

interface StoryItem {
  id: string;
  title: string;
  description: string;
  link: string;
  sourceUrl: string;
  pubDate: string;
}

function removeWWW(url: string): string {
  const hostname = url.split("//").pop()?.split("/")[0] || "";
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const {
    data: items = [],
    isLoading,
    error,
  } = useCachedPromise(async () => {
    const allItems = await Promise.all(
      feedURLs.map(async (url) => {
        const feed = await parser.parseURL(url);
        return feed.items.map(
          (item): StoryItem => ({
            id: item.guid || item.link || "",
            title: item.title || "",
            description: item.contentSnippet || item.content || "",
            link: item.link || "",
            sourceUrl: removeWWW(new URL(item.link || "").hostname),
            pubDate: item.pubDate || "Unknown date",
          }),
        );
      }),
    );
    return allItems.flat().sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  }, []);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed loading stories",
      message: error.message,
    });
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search early.tools news...">
      {items.map((item) => (
        <StoryListItem key={item.id} item={item} searchText={searchText} />
      ))}
    </List>
  );
}

function truncateText(text: string, maxLength: number = 60): string {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + "...";
  }
  return text;
}

function getFavicon(url: string): Image.Source | undefined {
  try {
    const domain = new URL(url).hostname;
    return {
      light: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      dark: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    } as Image.Source;
  } catch (error) {
    console.error("Error getting favicon:", error);
    return undefined;
  }
}

function StoryListItem({ item, searchText }: { item: StoryItem; searchText: string }) {
  const title = truncateText(item.title || item.description);
  const subtitle = truncateText(item.sourceUrl);
  const favicon = getFavicon(item.link);

  const isMatch =
    (item.title && item.title.toLowerCase().includes(searchText.toLowerCase())) ||
    (item.description && item.description.toLowerCase().includes(searchText.toLowerCase())) ||
    (item.link && item.link.toLowerCase().includes(searchText.toLowerCase()));

  if (searchText && !isMatch) {
    return null;
  }

  return (
    <List.Item
      icon={favicon ? { source: favicon } : Icon.Globe}
      title={title}
      subtitle={subtitle}
      accessories={[{ date: new Date(item.pubDate) }]}
      actions={<Actions item={item} />}
    />
  );
}

function Actions({ item }: { item: StoryItem }) {
  return (
    <ActionPanel title={item.title || item.description}>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={item.link} />
        <Action.CopyToClipboard content={item.link} title="Copy Link" shortcut={{ modifiers: ["cmd"], key: "." }} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
