import { Action, Icon, closeMainWindow, Color } from "@raycast/api";
import { BookmarkItem, BridgeMessage, DisplayTab } from "../types";
import { BookmarksView } from "./BookmarksView";
import { getActionShortcut } from "../helpers";

interface BookmarksActionProps {
  browserFilter: string;
  browserTarget: string;
  windowTarget?: string;
  sendToSocket: (msg: BridgeMessage) => void;
  moveBookmark: (id: string, parentId: string) => void;
  renameBookmark: (id: string, newTitle: string) => void;
  bookmarks: BookmarkItem[];
  requestData: (channel: string) => void;
  navigateCurrentTab: (url: string, tabs: DisplayTab[]) => void;
  allTabs?: DisplayTab[];
  onExit?: () => void;
}

export function BookmarksAction({
  browserFilter,
  browserTarget,
  windowTarget,
  sendToSocket,
  moveBookmark,
  renameBookmark,
  bookmarks,
  requestData,
  navigateCurrentTab,
  allTabs,
  onExit,
}: BookmarksActionProps) {
  const title =
    browserFilter === "all"
      ? "Bookmarks"
      : `${browserFilter.charAt(0).toUpperCase() + browserFilter.slice(1)} Bookmarks`;

  return (
    <Action.Push
      title={title}
      icon={{ source: Icon.Bookmark, tintColor: Color.Yellow }}
      shortcut={getActionShortcut("bookmarks") || { modifiers: ["shift"], key: "space" }}
      target={
        <BookmarksView
          folderId="root"
          title={title}
          browserFilter={browserFilter}
          onOpenBookmark={(url: string) => {
            sendToSocket({
              type: "CREATE_TAB",
              url,
              browser: browserTarget,
              windowId: windowTarget,
            });
            closeMainWindow();
          }}
          onDeleteBookmark={(id: string | number, isFolder: boolean) => {
            sendToSocket({ type: "REMOVE_BOOKMARK", id, isFolder });
          }}
          onMoveBookmark={moveBookmark}
          onRenameBookmark={renameBookmark}
          bookmarks={bookmarks}
          requestData={requestData}
          sendToSocket={sendToSocket}
          onOpenCurrentTab={(url: string) => navigateCurrentTab(url, allTabs || [])}
          onExit={onExit}
        />
      }
    />
  );
}
