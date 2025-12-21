import { List, Detail, showToast, Toast, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getNewsHtml } from "../api/news";
import { parseNewsHtml } from "../utils/newsParser";
import { htmlToMarkdown } from "../utils/htmlParser";
import { NewsItem } from "../types";

interface NewsViewProps {
  onLogout: () => void;
}

export function NewsView({ onLogout }: NewsViewProps) {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    setIsLoading(true);
    try {
      const html = await getNewsHtml();
      console.log("[NEWS_VIEW] Received HTML, length:", html?.length || 0);

      if (!html || html.length === 0) {
        throw new Error("Received empty HTML response");
      }

      const parsedItems = parseNewsHtml(html);
      console.log("[NEWS_VIEW] Parsed", parsedItems.length, "news items");

      if (parsedItems.length === 0) {
        console.warn("[NEWS_VIEW] No news items parsed from HTML. HTML preview:", html.substring(0, 500));
      }

      setNewsItems(parsedItems);
    } catch (error) {
      console.error("[NEWS_VIEW] Error loading news:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load news",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function formatNewsDetail(news: NewsItem): string {
    let markdown = `# ${news.title}\n\n`;

    if (news.date) {
      markdown += `**Date:** ${news.date}\n\n`;
    }

    if (news.preview) {
      markdown += `${news.preview}\n\n`;
    }

    // Metadata section
    const hasMetadata = news.metadata.from || news.metadata.to || news.metadata.published || news.metadata.showTo;
    if (hasMetadata) {
      markdown += `---\n\n`;

      if (news.metadata.from) {
        markdown += `**From:** ${news.metadata.from}\n\n`;
      }

      if (news.metadata.to) {
        markdown += `**To:** ${news.metadata.to}\n\n`;
      }

      if (news.metadata.published) {
        markdown += `**Published:** ${news.metadata.published}\n\n`;
      }

      if (news.metadata.showTo) {
        markdown += `**Show to:** ${news.metadata.showTo}\n\n`;
      }
    }

    // Content section
    if (news.content) {
      markdown += `---\n\n`;
      const parsedContent = htmlToMarkdown(news.content);
      if (parsedContent.trim()) {
        markdown += `${parsedContent}\n\n`;
      }
    }

    // Attachments section
    if (news.attachments && news.attachments.length > 0) {
      markdown += `---\n\n## Attachments\n\n`;
      news.attachments.forEach((attachment) => {
        markdown += `- **${attachment.name}**`;
        if (attachment.size) {
          markdown += ` (${attachment.size})`;
        }
        markdown += `\n`;
      });
      markdown += `\n`;
    }

    return markdown;
  }

  if (selectedNews) {
    return (
      <Detail
        markdown={formatNewsDetail(selectedNews)}
        actions={
          <ActionPanel>
            <Action title="Back to List" icon={Icon.ArrowLeft} onAction={() => setSelectedNews(null)} />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadNews} />
            <Action title="Logout" icon={Icon.Logout} onAction={onLogout} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search news..."
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadNews} />
          <Action title="Logout" icon={Icon.Logout} onAction={onLogout} />
        </ActionPanel>
      }
    >
      {newsItems.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Megaphone} title="No News" description="No news items available." />
      ) : (
        newsItems.map((news) => (
          <List.Item
            key={news.id}
            title={news.title}
            subtitle={news.preview || news.date}
            accessories={[
              news.date
                ? {
                    text: news.date,
                    icon: Icon.Calendar,
                  }
                : {},
              news.attachments && news.attachments.length > 0
                ? { icon: Icon.Paperclip, tooltip: `${news.attachments.length} attachment(s)` }
                : {},
            ]}
            actions={
              <ActionPanel>
                <Action title="View Details" icon={Icon.Eye} onAction={() => setSelectedNews(news)} />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadNews} />
                <Action title="Logout" icon={Icon.Logout} onAction={onLogout} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
