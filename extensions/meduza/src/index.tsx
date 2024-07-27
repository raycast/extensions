import { ActionPanel, Action, List, Detail, Image, showToast, Toast, Cache } from "@raycast/api";
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

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  return format(date, 'ru');
}

function extractImagesFromContent(content: string): string[] {
  const imgRegex = /<img.*?src="(.*?)".*?>/g;
  const matches = [...content.matchAll(imgRegex)];
  return matches.map(match => match[1]);
}

function ArticleDetail({ article }: { article: FeedItem }) {
  const [imageIndex, setImageIndex] = useState(0);
  const images = extractImagesFromContent(article.content);
  const featuredImage = article.enclosure?.url || article.icon;

  const markdown = `
![Featured Image](${featuredImage})

${formatDate(article.pubDate)}

${images.length > 0 ? `![Article Image](${images[imageIndex]})` : ''}

${stripHtml(article.content)}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={article.title}
      metadata={
        <Detail.Metadata>

          <Detail.Metadata.Label
            title={article.title}
            text={formatTimeAgo(article.pubDate)}
          />


          <Detail.Metadata.Link title="Original Article" target={article.link} text="Open in Browser" />
          {images.length > 0 && (
            <Detail.Metadata.TagList title="Images">
              {images.map((image, index) => (
                <Detail.Metadata.TagList.Item
                  key={index}
                  text={`Image ${index + 1}`}
                  onAction={() => setImageIndex(index)}
                />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={article.link} />
          <Action.CopyToClipboard content={article.link} title="Copy Link" />
          {images.length > 1 && (
            <Action
              title="Next Image"
              onAction={() => setImageIndex((imageIndex + 1) % images.length)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}


function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '');
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function Command() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed();
  }, []);

  async function fetchFeed() {
    setLoading(true);

    const feedUrl = "https://meduza.io/rss/all"

    try {
      const cachedData = cache.get("feedItems");
      if (cachedData) {
        setItems(JSON.parse(cachedData));
        setLoading(false);
      }

      const feed = await parser.parseURL(feedUrl);
      const newItems = feed.items.map((item: any) => ({
        icon: item.enclosure?.url || "icon.png",
        title: item.title || "",
        link: item.link || "",
        pubDate: item.pubDate || "",
        content: item.content || "",
        enclosure: item.enclosure,
      }));

      setItems(newItems);

      showToast(Toast.Style.Success, "Updated feed");
      cache.set("feedItems", JSON.stringify(newItems));
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
          icon={"icon.png"}
          title={item.title}
          accessories={[{ text: formatTimeAgo(item.pubDate) }]}
          actions={
            <ActionPanel>
              <Action.Push title="View Article" target={<ArticleDetail article={item} />} />
              <Action.OpenInBrowser url={item.link} />
              <Action.CopyToClipboard content={item.link} title="Copy Link" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}