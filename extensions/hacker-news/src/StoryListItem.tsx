import { useEffect, useState } from "react";
import { ActionPanel, List, Action, Icon } from "@raycast/api";
import Parser from "rss-parser";

export function StoryListItem(props: { item: Parser.Item; index: number }) {
  const [state, setState] = useState<{ icon: string; accessories: List.Item.Accessory[] }>({
    icon: getIcon(100),
    accessories: [],
  });

  useEffect(() => {
    const icon = getIcon(props.index + 1);
    const accessories = [];

    const points = getPoints(props.item);
    const comments = getComments(props.item);
    if (comments !== null) {
      accessories.push({ icon: Icon.Bubble, text: comments });
    }
    if (points !== null) {
      accessories.push({ icon: "👍", text: points });
    }

    setState({ icon, accessories });
  }, [props.item, props.index]);

  return (
    <List.Item
      icon={state.icon}
      title={props.item.title ?? "No title"}
      subtitle={props.item.creator}
      accessories={state.accessories}
      actions={<Actions item={props.item} />}
    />
  );
}

function Actions(props: { item: Parser.Item }) {
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>
        {props.item.link && <Action.OpenInBrowser url={props.item.link} />}
        {props.item.guid && <Action.OpenInBrowser url={props.item.guid} title="Open Comments in Browser" />}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {props.item.link && (
          <Action.CopyToClipboard
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
  return matches?.[0] || null;
}
function getComments(item: Parser.Item) {
  const matches = item.contentSnippet?.match(/(?<=Comments:\s*)(\d+)/g);
  return matches?.[0] || null;
}
