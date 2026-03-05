import { ActionPanel, Action, List, open, Color, Icon } from "@raycast/api";
import Parser from "rss-parser";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { useState } from "react";

const SOURCES = [
  {
    name: "BBC News",
    feeds: [
      { title: "Top Stories", url: "http://feeds.bbci.co.uk/news/rss.xml" },
      { title: "World", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
      { title: "UK", url: "http://feeds.bbci.co.uk/news/uk/rss.xml" },
      { title: "Business", url: "http://feeds.bbci.co.uk/news/business/rss.xml" },
      { title: "Technology", url: "http://feeds.bbci.co.uk/news/technology/rss.xml" },
      { title: "Science", url: "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml" },
      { title: "Health", url: "http://feeds.bbci.co.uk/news/health/rss.xml" },
    ],
  },
  {
    name: "The Guardian",
    feeds: [
      { title: "UK", url: "https://www.theguardian.com/uk/rss" },
      { title: "World", url: "https://www.theguardian.com/world/rss" },
      { title: "Technology", url: "https://www.theguardian.com/uk/technology/rss" },
    ],
  },
  {
    name: "Reuters",
    feeds: [{ title: "Top News", url: "https://feeds.reuters.com/reuters/topNews" }],
  },
  {
    name: "Politico",
    feeds: [{ title: "Politics", url: "https://rss.politico.com/politics-news.xml" }],
  },
];

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

async function fetchNews(url: string): Promise<NewsItem[]> {
  const parser = new Parser();
  const feed = await parser.parseURL(url);

  return feed.items.map((item) => ({
    title: item.title || "",
    link: item.link || "",
    pubDate: item.pubDate || "",
    description: item.contentSnippet || "",
  }));
}

export default function Command() {
  const [feedUrl, setFeedUrl] = useState(SOURCES[0].feeds[0].url);

  const { data: items, isLoading } = useCachedPromise(fetchNews, [feedUrl], {
    keepPreviousData: true,
  });

  const { value: readLinks = [], setValue: setReadLinks } = useLocalStorage<string[]>("readArticles", []);
  const readSet = new Set(readLinks);

  function markAsRead(link: string) {
    if (!readSet.has(link)) {
      setReadLinks([...readLinks, link]);
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="News Headlines"
      searchBarPlaceholder="Search headlines..."
      searchBarAccessory={
        <List.Dropdown tooltip="Source & Category" onChange={setFeedUrl}>
          {SOURCES.map((source) => (
            <List.Dropdown.Section key={source.name} title={source.name}>
              {source.feeds.map((feed) => (
                <List.Dropdown.Item key={feed.url} title={feed.title} value={feed.url} />
              ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
    >
      {items?.map((item, index) => (
        <List.Item
          key={index}
          title={item.title}
          accessories={[!readSet.has(item.link) ? { tag: { value: "New", color: Color.Blue } } : {}]}
          detail={
            <List.Item.Detail
              markdown={`## ${item.title}\n\n${item.description}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Published" text={new Date(item.pubDate).toLocaleString()} />
                  <List.Item.Detail.Metadata.Link title="Article" target={item.link} text="Open in Browser" />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Open in Browser"
                icon={Icon.Globe}
                onAction={() => {
                  open(item.link);
                  markAsRead(item.link);
                }}
              />
              <Action
                title="Mark as Read"
                icon={Icon.Circle}
                shortcut={{ modifiers: ["cmd"], key: "m" }}
                onAction={() => markAsRead(item.link)}
              />
              <Action.CopyToClipboard
                content={item.link}
                title="Copy Link"
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Open All in Browser"
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                onAction={() => items.forEach((i) => open(i.link))}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
