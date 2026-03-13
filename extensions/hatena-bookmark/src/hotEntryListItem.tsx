import { ActionPanel, List, Action, Icon, Image } from "@raycast/api";
import Parser from "rss-parser";
import { isNumber, isString } from "lodash";

export function HotEntryListItem(props: { item: Parser.Item; index: number }) {
  const icon = getIcon(props.index + 1);
  const accessories = [];
  const bookmarks = props.item["hatena:bookmarkcount" as keyof typeof isNumber];
  const commentsUrl = props.item["hatena:bookmarkCommentListPageUrl" as keyof typeof isString];
  if (commentsUrl !== null) {
    accessories.push({ icon: Icon.Bubble });
  }
  if (bookmarks !== null) {
    accessories.push({ icon: "🔖", text: bookmarks + "  " });
  }

  return (
    <List.Item
      icon={icon}
      title={props.item.title ?? "No title"}
      accessories={accessories}
      actions={<Actions item={props.item} />}
    />
  );
}

function Actions(props: { item: Parser.Item }) {
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>
        {props.item.link && <Action.OpenInBrowser url={props.item.link} />}
        {props.item.isoDate && (
          <Action.OpenInBrowser
            url={props.item["hatena:bookmarkCommentListPageUrl" as keyof typeof isString]}
            title="Open Comments in Browser"
          />
        )}
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

function getIcon(index: number): Image.ImageLike {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect x="0" y="0" width="40" height="40" fill="#00A4DE" rx="10"></rect>
  <text
  font-size="22"
  fill="white"
  font-family="Verdana"
  text-anchor="middle"
  alignment-baseline="baseline"
  x="20.5"
  y="32.5">${index}</text>
</svg>
  `.replaceAll("\n", "");

  return {
    source: `data:image/svg+xml,${svg}`,
  };
}
