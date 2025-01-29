import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import Parser from "rss-parser";
import { State } from "./types";
import { getIcon, getPubDate } from "./utils";

const parser = new Parser();

export default function Command() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchStories() {
      try {
        const feed = await parser.parseURL("https://feeds.macrumors.com/MacRumors-All");
        setState({ items: feed.items });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong."),
        });
      }
    }

    fetchStories();
  }, []);

  if (state.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed loading stories.",
      message: state.error.message,
    });
  }

  return (
    <List isLoading={!state.items && !state.error}>
      {state.items?.map((item, index) => <StoryListItem key={item.guid} item={item} index={index} />)}
    </List>
  );
}

function StoryListItem(props: { item: Parser.Item; index: number }) {
  const icon = getIcon(props.index + 1);
  const pubDate = getPubDate(props.item);

  return (
    <List.Item
      icon={icon}
      title={props.item.title ?? "No title"}
      subtitle={props.item.creator ?? "No author"}
      accessories={[{ text: pubDate ?? "No date" }]}
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
