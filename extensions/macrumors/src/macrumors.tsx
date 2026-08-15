import { Action, ActionPanel, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getIcon, getPubDate } from "./utils";
import Parser from "rss-parser";

export default function Command() {
  const { data, isLoading } = useCachedPromise(async () => {
    const parser = new Parser();
    const feed = await parser.parseURL("https://feeds.macrumors.com/MacRumors-All");
    return { items: feed.items };
  });

  return (
    <List isLoading={isLoading}>
      {data?.items?.map((item, index) => <StoryListItem key={item.guid} item={item} index={index} />)}
    </List>
  );
}

function StoryListItem(props: { item: Parser.Item; index: number }) {
  const icon = getIcon(props.index + 1);
  const pubDate = new Date(getPubDate(props.item) ?? "");

  return (
    <List.Item
      icon={icon}
      title={props.item.title ?? "No title"}
      subtitle={props.item.creator ?? "No author"}
      accessories={[{ date: pubDate }]}
      actions={<Actions item={props.item} />}
    />
  );
}

function Actions(props: { item: Parser.Item }) {
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>{props.item.link && <Action.OpenInBrowser url={props.item.link} />}</ActionPanel.Section>
      <ActionPanel.Section>
        {props.item.link && (
          <Action.CopyToClipboard
            content={props.item.link}
            title="Copy Article Link"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
