import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import Parser from "rss-parser";

const parser = new Parser();

interface State {
  items?: Parser.Item[];
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchStories() {
      try {
        const feed = await parser.parseURL("https://hnrss.org/frontpage?count=25");
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
    <List isLoading={!state.items && !state.error}>
      {state.items?.map((item, index) => (
        <StoryListItem key={item.guid} item={item} index={index} />
      ))}
    </List>
  );
}

function StoryListItem(props: { item: Parser.Item; index: number }) {
  const icon = getIcon(props.index + 1);
  const points = getPoints(props.item);
  const comments = getComments(props.item);

  return (
    <List.Item
      icon={icon}
      title={props.item.title ?? "No title"}
      subtitle={props.item.creator}
      accessoryTitle={`👍  ${points}    💬  ${comments}`}
      actions={<Actions item={props.item} />}
    />
  );
}

function Actions(props: { item: Parser.Item }) {
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>
        {props.item.link && <OpenInBrowserAction url={props.item.link} />}
        {props.item.guid && <OpenInBrowserAction url={props.item.guid} title="Open Comments in Browser" />}
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

const iconToEmojiMap = new Map<number, string>([
  [1, "1️⃣"],
  [2, "2️⃣"],
  [3, "3️⃣"],
  [4, "4️⃣"],
  [5, "5️⃣"],
  [6, "6️⃣"],
  [7, "7️⃣"],
  [8, "8️⃣"],
  [9, "9️⃣"],
  [10, "🔟"],
]);

function getIcon(index: number) {
  return iconToEmojiMap.get(index) ?? "⏺";
}

function getPoints(item: Parser.Item) {
  const matches = item.contentSnippet?.match(/(?<=Points:\s*)(\d+)/g);
  return matches?.[0];
}

function getComments(item: Parser.Item) {
  const matches = item.contentSnippet?.match(/(?<=Comments:\s*)(\d+)/g);
  return matches?.[0];
}
