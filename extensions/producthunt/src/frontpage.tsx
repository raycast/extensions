import { ActionPanel, List, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import Parser from "rss-parser";
import { getIcon } from "./utils";

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  author: string;
  content: string;
  contentSnippet: string;
  id: string;
  isoDate: string;
  updated: string;
}

export default function Command() {
  const { data, isLoading } = useFetch("https://www.producthunt.com/feed?category=undefined", {
    async parseResponse(response) {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = await response.text();

      if (data !== undefined) {
        const parser: Parser = new Parser({
          customFields: {
            item: ["updated"],
          },
        });
        const feed = await parser.parseString(data as string);

        feed.items.forEach((item) => {
          console.log(item);
        });

        return { items: feed.items as FeedItem[] };
      }
      return { items: [] };
    },
  });

  return (
    <List isLoading={isLoading}>
      <List.EmptyView icon="no-view.png" title="No Results" />
      {data && data.items?.map((item, index) => <StoryListItem key={item.id} item={item} index={index} />)}
    </List>
  );
}

function getCleanDescription(text: string): string {
  const cleanedText = text
    .replace(/<[^>]*>/g, "")
    .replace(/\b(Discussion|Link)\b|\s*\|\s*/g, "")
    .trim();

  const sentences = cleanedText.split(/(?<=[.!?])\s+/);

  return sentences[0] || "";
}

function StoryListItem(props: { item: FeedItem; index: number }) {
  const { item, index } = props;
  const date = new Date(item.updated);
  const cleanedContent = getCleanDescription(item.content);
  return (
    <List.Item
      icon={getIcon(index + 1)}
      title={item.title ?? "No title"}
      subtitle={cleanedContent ?? "No author"}
      keywords={[item.author]}
      actions={<Actions item={item} />}
      accessories={[
        {
          text: item.author,
        },
        {
          date: date,
          tooltip: date.toLocaleString(),
        },
      ]}
    />
  );
}

function Actions(props: { item: Parser.Item }) {
  const { item } = props;

  return (
    <ActionPanel title={item.title}>
      <ActionPanel.Section>
        {item.link && <Action.OpenInBrowser url={item.link} />}
        {item.link && (
          <Action.CopyToClipboard content={item.link} title="Copy Link" shortcut={{ modifiers: ["cmd"], key: "." }} />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
