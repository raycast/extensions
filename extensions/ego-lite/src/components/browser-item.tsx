import { Action, ActionPanel, closeMainWindow, Icon, Keyboard, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";

import { openUrlInNewTab, showEgoLiteFailure } from "../lib/ego-lite";
import { displayHost, markdownLink } from "../lib/presentation";

interface BrowserItemProps {
  title: string;
  url: string;
  icon?: List.Item.Props["icon"];
  path?: string;
  lastVisitedAt?: string;
}

function fallbackIconForUrl(url: string): List.Item.Props["icon"] {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return Icon.Link;
    return getAvatarIcon(displayHost(url));
  } catch {
    return Icon.Link;
  }
}

function formatLastVisited(value: string): string {
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(date);
}

export function BrowserItem({ title, url, icon, path, lastVisitedAt }: BrowserItemProps) {
  const accessories: List.Item.Accessory[] = [];
  if (path) accessories.push({ text: path, tooltip: path });
  if (lastVisitedAt) {
    const formatted = formatLastVisited(lastVisitedAt);
    accessories.push({ text: formatted, tooltip: `Last visited ${formatted}` });
  }

  return (
    <List.Item
      icon={icon ?? fallbackIconForUrl(url)}
      title={title || url}
      subtitle={{ value: displayHost(url), tooltip: url }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Globe}
            title="Open in Ego Lite"
            onAction={async () => {
              try {
                await openUrlInNewTab(url);
                await closeMainWindow();
              } catch (error) {
                await showEgoLiteFailure(error, "Could not open URL in Ego Lite");
              }
            }}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard content={url} title="Copy URL" shortcut={Keyboard.Shortcut.Common.Copy} />
            <Action.CopyToClipboard
              content={title || url}
              title="Copy Title"
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
            <Action.CopyToClipboard content={markdownLink(title || url, url)} title="Copy as Markdown" />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
