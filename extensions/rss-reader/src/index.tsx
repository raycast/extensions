import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import Parser from "rss-parser";
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en.json'

const parser = new Parser({});

TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')

const feedURL = getPreferenceValues().feed

interface State {
  items?: Parser.Item[];
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({});
  

  useEffect(() => {
    async function fetchStories() {
      try {
        const feed = await parser.parseURL(feedURL);
        setState({ items: feed.items });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }

    fetchStories();
  }, []);

  if (state.error) {
    showToast(ToastStyle.Failure, "Failed loading stories", state.error.message);
  }

  return (
    <List isLoading={state.items === undefined}>
      {state.items?.map((item, index) => (
        <StoryListItem key={item.guid} item={item} index={index} />
      ))}
    </List>
  );
}

function StoryListItem(props: { item: Parser.Item; index: number }) {
  const pubAgo = getTimeAgo(props.item) as string;

  return (
    <List.Item
      title={props.item.title ?? "No title"}
      subtitle={props.item.summary}
      accessoryTitle={pubAgo}
      actions={<Actions item={props.item} />}
    />
  );
}

function Actions(props: { item: Parser.Item }) {
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>
        {props.item.link && <OpenInBrowserAction url={props.item.link} />}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {props.item.link && (
          <CopyToClipboardAction
            content={props.item.link}
            title="Copy Link"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function getTimeAgo(item: Parser.Item) {
  return timeAgo.format(Date.parse(item.pubDate!))
}
