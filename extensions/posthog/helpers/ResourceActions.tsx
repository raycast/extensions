import { Action, ActionPanel } from "@raycast/api";

type ResourceActionsProps = {
  title: string;
  url: string;
};

export function ResourceActions({ title, url }: ResourceActionsProps) {
  return (
    <ActionPanel title={title}>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={url} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
