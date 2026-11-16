import { DIA_APPLICATION } from "../platform";
import { Action, ActionPanel, closeMainWindow, Color, Icon, List, open, Keyboard } from "@raycast/api";
import { getSafeFavicon } from "../utils";
import { collectUrlsFromFolder } from "../bookmarks/utils";
import { BookmarkItem } from "../bookmarks/types";

async function openInDia(url: string) {
  await open(url, DIA_APPLICATION);
  await closeMainWindow();
}

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

    const children = item.children ?? [];
    const childCount = children.length;
    const urls = collectUrlsFromFolder(children);
    const urlCount = urls.length;

    return (
      <List.Item
        id={item.id}
        title={item.name}
        icon={{ source: Icon.Folder, tintColor: Color.Blue }}
        accessories={[{ text: `${childCount} item${childCount !== 1 ? "s" : ""}` }]}
        actions={
          <ActionPanel title={item.name}>
            <Action title="Open Folder" icon={Icon.ArrowRight} onAction={() => onNavigate(item.idPath)} />
            {urlCount > 0 && (
              <Action
                title={`Open All ${urlCount} in Dia`}
                icon={Icon.Globe}
                shortcut={Keyboard.Shortcut.Common.Open}
                onAction={async () => {
                  for (const url of urls) {
                    await open(url, DIA_APPLICATION);
                  }
                  await closeMainWindow();
                }}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  // URL bookmark
  if (item.url) {
    const url = item.url;
    const pathText = item.path.length > 1 ? item.path.slice(0, -1).join(" › ") : undefined;

    return (
      <List.Item
        id={item.id}
        title={item.name}
        subtitle={pathText}
        icon={getSafeFavicon(item.url)}
        actions={
          <ActionPanel title={item.name}>
            <Action title="Open in Dia" icon={Icon.Globe} onAction={() => openInDia(url)} />
            <Action.OpenInBrowser url={url} shortcut={Keyboard.Shortcut.Common.Open} />
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
            <Action.CopyToClipboard title="Copy Title" content={item.name} shortcut={Keyboard.Shortcut.Common.Copy} />
          </ActionPanel>
        }
      />
    );
  }

  return null;
}
