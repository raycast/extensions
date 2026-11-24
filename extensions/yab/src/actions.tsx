import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { openTab, openWindow } from "./yab";

export function UrlActions({ url, title }: { url: string; title?: string }) {
  return (
    <>
      <Action title="Open in New Tab" icon={Icon.Plus} onAction={() => openTab(url)} />
      <Action.OpenInBrowser title="Open in Default Browser" url={url} shortcut={Keyboard.Shortcut.Common.Open} />
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        <Action.CopyToClipboard
          title="Copy as Markdown Link"
          content={`[${title || url}](${url})`}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="New Window"
          icon={Icon.AppWindow}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => openWindow()}
        />
      </ActionPanel.Section>
    </>
  );
}
