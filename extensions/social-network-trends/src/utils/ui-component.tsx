import { Action, ActionPanel, Icon } from "@raycast/api";

export function TrendActions(props: { url: string; name: string }) {
  const { url, name } = props;
  return (
    <ActionPanel>
      <Action.OpenInBrowser url={url} />
      <Action.CopyToClipboard
        icon={Icon.Clipboard}
        title={"Copy Trend Title"}
        shortcut={{ modifiers: ["shift", "cmd"], key: "." }}
        content={name}
      />
      <Action.CopyToClipboard
        icon={Icon.Link}
        title={"Copy Trend Link"}
        shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
        content={url}
      />
    </ActionPanel>
  );
}
