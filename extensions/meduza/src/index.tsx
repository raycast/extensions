import { ActionPanel, Action, List, showToast, Toast, Cache, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { format } from "timeago.js";
import Parser from "rss-parser";

const parser = new Parser();
const cache = new Cache();

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  icon: string;
  enclosure?: {
    url: string;
  };
}

interface FeedConfig {
  url: string;
  cacheKey: string;
}

const FEEDS: { [key: string]: FeedConfig } = {
  ru: {
    url: "https://meduza.io/rss/all",
    cacheKey: "meduzaRussianFeedItems",
  },
  en: {
    url: "https://meduza.io/rss/en/all",
    cacheKey: "meduzaEnglishFeedItems",
  },
};

function formatTimeAgo(dateString: string, locale: string): string {
  const date = new Date(dateString);
  return format(date, locale);
}

function ArticleDetail({ article, locale }: { article: FeedItem; locale: string }) {
  const featuredImage = article.enclosure?.url || article.icon;

  const markdown = `
![Featured Image](${featuredImage})

${formatTimeAgo(article.pubDate, locale)}

${stripHtml(article.content)}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={article.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title={article.title} text={formatTimeAgo(article.pubDate, locale)} />

          <Detail.Metadata.Link title="Original Article" target={article.link} text="Open in Browser" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={article.link} />
          <Action.CopyToClipboard content={article.link} title="Copy Link" />
        </ActionPanel>
      }
    />
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, "");
}

export function MeduzaFeed({ feedKey }: { feedKey: "ru" | "en" }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const feedConfig = FEEDS[feedKey];

  useEffect(() => {
    fetchFeed();
  }, []);

  async function fetchFeed() {
    setLoading(true);

    try {
      const cachedData = cache.get(feedConfig.cacheKey);
      if (cachedData) {
        setItems(JSON.parse(cachedData));
        setLoading(false);
      }

      const feed = await parser.parseURL(feedConfig.url);
      const newItems = feed.items.map((item) => ({
        icon: item.enclosure?.url || "icon.png",
        title: item.title || "",
        link: item.link || "",
        pubDate: item.pubDate || "",
        content: item.content || "",
        enclosure: item.enclosure,
      }));

      setItems(newItems);

      showToast(Toast.Style.Success, "Updated feed");
      cache.set(feedConfig.cacheKey, JSON.stringify(newItems));
    } catch (error) {
      console.error(error);
      showToast(Toast.Style.Failure, "Failed to fetch feed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search articles..."
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={fetchFeed} />
        </ActionPanel>
      }
    >
      {items.map((item) => (
        <List.Item
          key={item.link}
          title={item.title}
          icon={"icon.png"}
          accessories={[{ text: formatTimeAgo(item.pubDate, feedKey) }]}
          actions={
            <ActionPanel>
              <Action.Push title="View Article" target={<ArticleDetail article={item} locale={feedKey} />} />
              <Action.OpenInBrowser url={item.link} />
              <Action.CopyToClipboard content={item.link} title="Copy Link" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
