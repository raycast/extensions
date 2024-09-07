import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import Parser from "rss-parser";

const parser = new Parser();

const sources = [
  { name: "Dutch News", url: "https://www.dutchnews.nl/feed/" },
  { name: "NL Times", url: "https://nltimes.nl/feed/" },
  { name: "IamExpat", url: "https://www.iamexpat.nl/rss/news-netherlands/news" },
  { name: "The Guardian - Netherlands", url: "https://www.theguardian.com/world/netherlands/rss" },
];

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  favicon: string;
}

function getFaviconUrl(url: string): string {
  const domain = new URL(url).hostname;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

export default function Command() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  useEffect(() => {
    fetchNews();
  }, []);

  async function fetchNews() {
    setIsLoading(true);
    const allItems: NewsItem[] = [];
    for (const source of sources) {
      try {
        const feed = await parser.parseURL(source.url);
        const sourceItems = feed.items.map((item) => {
          let pubDate = new Date(item.pubDate || "");
          
          if (isNaN(pubDate.getTime())) {
            // If the date is invalid, try parsing it manually
            const parts = item.pubDate?.split(' ') || [];
            if (parts.length >= 5) {
              pubDate = new Date(`${parts[1]} ${parts[2]} ${parts[3]} ${parts[4]} GMT${parts[5] || ''}`);
            }
          }

          // If still invalid, use current date as fallback
          if (isNaN(pubDate.getTime())) {
            pubDate = new Date();
          }

          return {
            title: item.title || "",
            link: item.link || "",
            pubDate: pubDate.toISOString(),
            source: source.name,
            favicon: getFaviconUrl(source.url),
          };
        });
        allItems.push(...sourceItems);
      } catch (error) {
        console.error(`Error fetching ${source.name}:`, error);
        showToast({
          style: Toast.Style.Failure,
          title: `Failed to fetch news from ${source.name}`,
          message: "Please check the console for more details.",
        });
      }
    }
    // Sort items by publication date, latest first
    setItems(allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()));
    setIsLoading(false);
  }

  const filteredItems = selectedSource ? items.filter((item) => item.source === selectedSource) : items;

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select News Source"
          storeValue={true}
          onChange={(newValue) => setSelectedSource(newValue === "Latest Headlines" ? null : newValue)}
        >
          <List.Dropdown.Item title="Latest Headlines" value="Latest Headlines" />
          {sources.map((source) => (
            <List.Dropdown.Item key={source.name} title={source.name} value={source.name} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredItems.map((item, index) => (
        <List.Item
          key={index}
          title={item.title}
          subtitle={item.source}
          accessories={[{ text: formatDate(item.pubDate) }]}
          icon={{ source: item.favicon }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.link} />
              <Action.CopyToClipboard content={item.link} title="Copy Link" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}