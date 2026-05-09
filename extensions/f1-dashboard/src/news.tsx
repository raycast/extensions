import { List, Icon, ActionPanel, Action, Detail } from "@raycast/api";
import { usePromise, useAI } from "@raycast/utils";
import Parser from "rss-parser";

const parser = new Parser();
const FEED_URL = "https://www.autosport.com/rss/f1/news/";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  author: string;
  imageUrl: string;
}

// AI Reader
function ArticleDetail({ article }: { article: NewsItem }) {
  const { data: aiSummary, isLoading: isAiLoading } = useAI(
    `You are an expert F1 journalist. Summarize the core facts of this news update into 3 concise bullet points. 
    
    Title: ${article.title}
    
    Context: ${article.contentSnippet}`,
  );

  const formattedDate = new Date(article.pubDate).toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const imageMarkdown = article.imageUrl
    ? `![](${article.imageUrl}?raycast-height=200)\n\n`
    : "";

  const markdown = `
# ${article.title}

**Published:** ${formattedDate}
${article.author ? `**Author:** ${article.author}` : ""}

${imageMarkdown}### ✨ AI Summary
${isAiLoading ? "*Generating summary...*" : aiSummary}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Article Preview"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Read Full Article in Browser"
            url={article.link}
          />
          <Action.CopyToClipboard
            title="Copy Article Link"
            content={article.link}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

// News List
export default function News() {
  const { isLoading, data: articles = [] } = usePromise(
    async (): Promise<NewsItem[]> => {
      const feed = await parser.parseURL(FEED_URL);

      return feed.items.map((item) => {
        let extractedImage = "";
        if (item.enclosure && item.enclosure.url) {
          extractedImage = item.enclosure.url;
        } else if (item.content) {
          const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch) {
            extractedImage = imgMatch[1];
          }
        }

        return {
          title: item.title || "Untitled Article",
          link: item.link || "",
          pubDate: item.pubDate || new Date().toISOString(),
          contentSnippet: item.contentSnippet || item.content || "",
          author: item.creator || "",
          imageUrl: extractedImage,
        };
      });
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search latest F1 news...">
      {articles.map((article, index) => {
        const date = new Date(article.pubDate);
        const listDate = date.toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
        });

        return (
          <List.Item
            key={index}
            title={article.title}
            icon={Icon.QuoteBlock}
            accessories={[{ text: listDate }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Read AI Summary"
                  icon={Icon.Stars}
                  target={<ArticleDetail article={article} />}
                />
                <Action.OpenInBrowser
                  title="Open Directly in Browser"
                  url={article.link}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
