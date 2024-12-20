import { ActionPanel, Action, List, Detail, Icon, AI } from "@raycast/api";
import { useFetch, useAI } from "@raycast/utils";
import { format } from "timeago.js";
import Parser from "rss-parser";

const parser = new Parser();

type FeedKey = "ru" | "en";

interface FeedItem {
  readonly title: string;
  readonly link: string;
  readonly pubDate: string;
  readonly content: string;
  readonly icon: string;
  readonly enclosure?: {
    readonly url: string;
  };
}

interface FeedConfig {
  readonly url: string;
  readonly locale: string;
}

const FEEDS: Record<FeedKey, FeedConfig> = {
  ru: {
    url: "https://meduza.io/rss/all",
    locale: "ru",
  },
  en: {
    url: "https://meduza.io/rss/en/all",
    locale: "en",
  },
} as const;

function formatTimeAgo(dateString: string, locale: string): string {
  return format(new Date(dateString), locale);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, "");
}

interface ArticleDetailProps {
  readonly article: FeedItem;
  readonly locale: string;
}

function ArticleDetail({ article, locale }: ArticleDetailProps): JSX.Element {
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
          <Action.CopyToClipboard
            content={article.link}
            title="Copy Link"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

interface MeduzaFeedProps {
  readonly feedKey: FeedKey;
}

export function MeduzaFeed({ feedKey }: MeduzaFeedProps): JSX.Element {
  const {
    data: items = [],
    isLoading,
    revalidate,
  } = useFetch(FEEDS[feedKey].url, {
    parseResponse: async (response) => {
      const text = await response.text();
      const feed = await parser.parseString(text);
      return feed.items.map((item) => ({
        icon: item.enclosure?.url || "icon.png",
        title: item.title || "",
        link: item.link || "",
        pubDate: item.pubDate || "",
        content: item.content || "",
        enclosure: item.enclosure,
      }));
    },
    initialData: [],
  });

  const placeholder = feedKey === "ru" ? "Поиск статей..." : "Search articles...";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={placeholder}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {items.map((item) => (
        <List.Item
          key={item.link}
          title={item.title}
          icon={Icon.Document}
          accessories={[{ text: formatTimeAgo(item.pubDate, FEEDS[feedKey].locale) }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Article"
                icon={Icon.Eye}
                target={<ArticleDetail article={item} locale={FEEDS[feedKey].locale} />}
              />
              <Action.OpenInBrowser url={item.link} />
              <Action.CopyToClipboard content={item.link} title="Copy Link" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface NewsSummaryProps {
  readonly feedKey: FeedKey;
}

export function NewsSummary({ feedKey }: NewsSummaryProps): JSX.Element {
  const { data: items = [], isLoading } = useFetch(FEEDS[feedKey].url, {
    parseResponse: async (response) => {
      const text = await response.text();
      const feed = await parser.parseString(text);
      return feed.items.map((item) => ({
        title: item.title || "",
        link: item.link || "",
        pubDate: item.pubDate || "",
        content: item.content || "",
      }));
    },
    initialData: [],
  });

  const newsDigest = items
    .map((item) => `${item.title}\n${item.pubDate} ${item.link}\n${stripHtml(item.content)}`)
    .join("\n\n");

  const prompt = `Create a structured summary with "read more" links to meduza.io and date main news based on these articles. 
       Divide by categories (politics, society, economy, etc.). 
       Use emojis for news.
       Wish a good day by summarizing at the start.
       News:\n\n${newsDigest}
       
       Respond in ${feedKey} language`;

  const { data: summary, isLoading: isSummaryLoading } = useAI(prompt, {
    model: AI.Model["Anthropic_Claude_Sonnet"],
    creativity: 0.1,
    stream: true,
  });

  const title = feedKey === "ru" ? "Дайджест новостей" : "News Digest";
  const loadingText = feedKey === "ru" ? "Создаю сводку событий..." : "Generating news summary...";

  const markdown = `
# ${title}
${isSummaryLoading ? loadingText : ""}

${summary || ""}
  `;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading || isSummaryLoading}
      actions={
        <ActionPanel>
          <Action.Open
            title={feedKey === "ru" ? "Чат" : "Chat"}
            target={`raycast://extensions/raycast/raycast-ai/ai-chat?fallbackText=${summary}`}
          />
          <Action.CopyToClipboard
            content={summary || ""}
            title={feedKey === "ru" ? "Скопировать сводку" : "Copy Summary"}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    />
  );
}
