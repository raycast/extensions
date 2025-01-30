import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { getIcon, getPubDate } from "./utils";
import Parser from "rss-parser";

const parser = new Parser();

export default function Command() {
  const {
    data: state,
    isLoading,
    error,
    revalidate: fetchStories,
  } = useCachedPromise(
    async () => {
      const feed = await parser.parseURL("https://feeds.macrumors.com/MacRumors-All");
      return { items: feed.items };
    },
    [],
    { execute: false },
  );

  useEffect(() => {
    fetchStories();
  }, []);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed loading stories.",
      message: error.message,
    });
  }

  return (
    <List isLoading={isLoading}>
      {state?.items?.map((item, index) => <StoryListItem key={item.guid} item={item} index={index} />)}
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
