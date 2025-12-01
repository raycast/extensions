import { List, ActionPanel, Action, Icon, Color, Image } from "@raycast/api";
import { useEffect, useState } from "react";
import Parser from "rss-parser";

interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  contentSnippet?: string;
  description?: string;
  summary?: string;
  content?: string;
  "media:content"?: {
    $?: {
      url?: string;
    };
  };
}

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
  imageUrl?: string;
  content?: string;
}

export default function Command() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showingDetail, setShowingDetail] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const parser = new Parser({
          customFields: {
            item: [["media:content", "media:content", { keepArray: false }]],
          },
        });
        const feed = await parser.parseURL("https://www.hltv.org/rss/news");
        const items = feed.items.map((item: RSSItem) => {
          console.log("Item data:", {
            title: item.title,
            contentSnippet: item.contentSnippet,
            description: item.description,
            content: item.content,
            summary: item.summary,
          });
          return {
            title: item.title || "No title",
            link: item.link || "",
            pubDate: item.pubDate || "",
            contentSnippet: item.contentSnippet || item.description || item.summary || "",
            content: item.content,
            imageUrl: item["media:content"]?.$?.url || "",
          };
        });
        setNews(items);
      } catch (error) {
        console.error("Failed to fetch HLTV news:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNews();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search HLTV news..." isShowingDetail={showingDetail}>
      {news.map((item, index) => (
        <List.Item
          key={index}
          title={item.title}
          subtitle={showingDetail ? undefined : item.contentSnippet}
          icon={{ source: item.imageUrl || Icon.Document, mask: Image.Mask.RoundedRectangle }}
          accessories={
            showingDetail
              ? undefined
              : [
                  {
                    icon: Icon.Clock,
                    text: formatDate(item.pubDate),
                    tooltip: new Date(item.pubDate).toLocaleString(),
                  },
                ]
          }
          detail={
            <List.Item.Detail
              markdown={
                item.imageUrl
                  ? `![Header](${item.imageUrl})\n\n${item.contentSnippet || "No description available"}`
                  : `${item.contentSnippet || "No description available"}`
              }
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Description"
                    text={item.contentSnippet || "No description available"}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Published"
                    text={formatDate(item.pubDate)}
                    icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
                  />
                  <List.Item.Detail.Metadata.Label title="Date" text={new Date(item.pubDate).toLocaleString()} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Link title="Read on HLTV" target={item.link} text="Open Article" />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.link} title="Open in Browser" />
              <Action
                title="Toggle Detail"
                icon={Icon.AppWindowSidebarLeft}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => setShowingDetail(!showingDetail)}
              />
              <Action.CopyToClipboard
                title="Copy Link"
                content={item.link}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              <Action.CopyToClipboard
                title="Copy Title"
                content={item.title}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
