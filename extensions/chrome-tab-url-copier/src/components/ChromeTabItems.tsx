import { Tab } from "../interfaces";
import { List, ActionPanel, Action, showHUD } from "@raycast/api";

export function TabListItem(props: { tab: Tab; useOriginalFavicon: boolean; onTabClosed?: () => void }) {
  const markdownLink = `[${props.tab.title}](${props.tab.url})`;

  return (
    <List.Item
      title={props.tab.title}
      subtitle={props.tab.urlWithoutScheme()}
      keywords={[props.tab.urlWithoutScheme()]}
      icon={props.useOriginalFavicon ? props.tab.realFavicon() : props.tab.googleFavicon()}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy URL as Markdown"
            content={markdownLink}
            onCopy={() => showHUD("Copied to clipboard")}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={props.tab.url}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
