import { ActionPanel, Action, Icon, Keyboard } from "@raycast/api";

interface EmptyContentActionsProps {
  url: string;
}

export function EmptyContentActions({ url }: EmptyContentActionsProps) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open in Browser"
        url={url}
        shortcut={Keyboard.Shortcut.Common.Open}
        icon={Icon.Globe}
      />
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
    </ActionPanel>
  );
}
