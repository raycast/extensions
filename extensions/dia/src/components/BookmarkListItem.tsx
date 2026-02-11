import { useMemo } from "react";
import { Action, ActionPanel, closeMainWindow, Color, Icon, List, open } from "@raycast/api";
import { getSafeFavicon } from "../utils";
import { collectUrlsFromFolder } from "../bookmarks/utils";
import { BookmarkItem } from "../bookmarks/types";

const DIA_BUNDLE_ID = "company.thebrowser.dia";

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
    const urls = useMemo(() => collectUrlsFromFolder(children), [children]);
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
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={async () => {
                  for (const url of urls) {
                    await open(url, DIA_BUNDLE_ID);
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
