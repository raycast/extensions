import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getSafeFavicon } from "../utils";
import { BookmarkItem } from "../bookmarks/types";

export function BookmarkListItem({
  item,
  onNavigate,
}: {
  item: BookmarkItem;
  onNavigate?: (idPath: string[]) => void;
}) {
  if (item.type === "folder") {
    // If no navigation handler, don't render folders
    if (!onNavigate) {
      return null;
    }

    const childCount = item.children?.length || 0;
    return (
      <List.Item
        id={item.id}
        title={item.name}
        icon={{ source: Icon.Folder, tintColor: Color.Blue }}
        accessories={[{ text: `${childCount} item${childCount !== 1 ? "s" : ""}` }]}
        actions={
          <ActionPanel title={item.name}>
            <Action title="Open Folder" icon={Icon.ArrowRight} onAction={() => onNavigate(item.idPath)} />
          </ActionPanel>
        }
      />
    );
  }

  // URL bookmark
  if (item.url) {
    const pathText = item.path.length > 1 ? item.path.slice(0, -1).join(" › ") : undefined;

    return (
      <List.Item
        id={item.id}
        title={item.name}
        subtitle={pathText}
        icon={getSafeFavicon(item.url)}
        actions={
          <ActionPanel title={item.name}>
            <Action.Open icon={Icon.Globe} title="Open Tab" target={item.url} application="company.thebrowser.dia" />
            <Action.OpenInBrowser url={item.url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <Action.CopyToClipboard title="Copy URL" content={item.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            <Action.CopyToClipboard
              title="Copy Title"
              content={item.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return null;
}
