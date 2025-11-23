import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { type HistoryItem } from "../dia";
import { getSubtitle } from "../utils";

interface HistoryListItemProps {
  item: HistoryItem;
}

export function HistoryListItem({ item }: HistoryListItemProps) {
  return (
    <List.Item
      icon={getFavicon(item.url, { mask: Image.Mask.Circle })}
      title={item.title}
      subtitle={{ value: getSubtitle(item.url), tooltip: item.url }}
      accessories={[{ date: new Date(item.lastVisitedAt) }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open
              icon={Icon.Globe}
              title="Open in Browser"
              target={item.url}
              application="company.thebrowser.dia"
            />
            <Action.OpenWith icon={Icon.AppWindow} path={item.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard content={item.url} title="Copy URL" shortcut={Keyboard.Shortcut.Common.Copy} />
            <Action.CopyToClipboard
              content={{ html: `<a href="${item.url}">${item.title}</a>` }}
              title="Copy Formatted URL"
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />
            <Action.CopyToClipboard
              content={item.title}
              title="Copy Title"
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
            <Action.CopyToClipboard content={`[${item.title}](${item.url})`} title="Copy as Markdown" />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CreateQuicklink
              quicklink={{ link: item.url, name: item.title }}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
