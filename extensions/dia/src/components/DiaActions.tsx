import { Action, ActionPanel, closeMainWindow, Icon } from "@raycast/api";
import { openNewTab } from "../actions";
import { BookmarkItem } from "../interfaces";

/**
 * Actions for history items
 */
function TabHistoryActions({ title, url }: { title: string; url: string }) {
  return (
    <ActionPanel title={title}>
      <Action
        title="Open in Dia"
        icon={Icon.Globe}
        onAction={async () => {
          await openNewTab(url);
          await closeMainWindow();
        }}
      />
      <Action.OpenInBrowser url={url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
      <Action.CopyToClipboard title="Copy Title" content={title} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
    </ActionPanel>
  );
}

/**
 * Actions for bookmark folders
 */
function FolderActions({ item, onNavigate }: { item: BookmarkItem; onNavigate: (idPath: string[]) => void }) {
  return (
    <ActionPanel title={item.name}>
      <Action title="Open Folder" icon={Icon.ArrowRight} onAction={() => onNavigate(item.idPath)} />
    </ActionPanel>
  );
}

/**
 * Actions for bookmark URLs
 */
function BookmarkActions({ item }: { item: BookmarkItem }) {
  if (!item.url) return null;

  return (
    <ActionPanel title={item.name}>
      <Action
        title="Open in Dia"
        icon={Icon.Globe}
        onAction={async () => {
          await openNewTab(item.url!);
          await closeMainWindow();
        }}
      />
      <Action.OpenInBrowser url={item.url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
      <Action.CopyToClipboard title="Copy URL" content={item.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
      <Action.CopyToClipboard
        title="Copy Title"
        content={item.name}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
    </ActionPanel>
  );
}

export const DiaActions = {
  TabHistory: TabHistoryActions,
  Folder: FolderActions,
  Bookmark: BookmarkActions,
};
