import {
  ActionPanel,
  Action,
  List,
  Icon,
  useNavigation,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Color,
  getPreferenceValues,
} from "@raycast/api";
import { BookmarkItem, BridgeMessage } from "../types";
import {
  getBookmarkIcon,
  formatTimeAgo,
  getActionShortcut,
  forceCopy,
} from "../helpers";
import { BookmarkFolderPicker } from "./BookmarkFolderPicker";
import { RenameBookmarkForm } from "./RenameBookmarkForm";
import { useState, useMemo, useEffect } from "react";
import {
  subscribeToBookmarks,
  getCurrentBookmarks,
} from "../context/BrowserStore";

interface BookmarksViewProps {
  folderId?: string;
  title?: string;
  browserFilter: string;
  onOpenBookmark: (url: string) => void;
  onDeleteBookmark: (
    id: string,
    isFolder: boolean,
    browserType?: string,
  ) => void;
  onMoveBookmark: (id: string, parentId: string) => void;
  onRenameBookmark: (id: string, newTitle: string) => void;
  onOpenCurrentTab?: (url: string) => void;
  bookmarks: BookmarkItem[];
  requestData?: (channel: string) => void;
  sendToSocket?: (msg: BridgeMessage) => void;
  onExit?: () => void;
  path?: string[];
}

function findFolderById(tree: BookmarkItem[], id: string): BookmarkItem | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findFolderById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function BookmarksView({
  folderId = "root",
  title = "Bookmarks",
  browserFilter,
  onOpenBookmark,
  onDeleteBookmark,
  onMoveBookmark,
  onRenameBookmark,
  onOpenCurrentTab,
  bookmarks,
  requestData,
  sendToSocket,
  onExit,
  path = [],
}: BookmarksViewProps) {
  const [searchText, setSearchText] = useState("");
  const { pop } = useNavigation();
  const [isShowingRoot, setIsShowingRoot] = useState(false);

  // V320: Live bookmark subscription — use prop as initial value,
  // then auto-update from global store whenever server sends fresh data
  const [liveBookmarks, setLiveBookmarks] = useState<BookmarkItem[]>(() => {
    const current = getCurrentBookmarks() as BookmarkItem[];
    return current.length > 0 ? current : bookmarks;
  });

  useEffect(() => {
    const unsubscribe = subscribeToBookmarks((freshBookmarks) => {
      if (freshBookmarks.length > 0) {
        setLiveBookmarks(freshBookmarks as BookmarkItem[]);
      }
    });
    return unsubscribe;
  }, []);

  // V350: On-demand fetching (Lazy Loading)
  // V44: Universal Rebuild - Trigger onExit on unmount
  useEffect(() => {
    return () => {
      if (onExit) onExit();
    };
  }, [onExit]);

  // V400: Subscription lifecycle — tell browser to start/stop pulling bookmarks
  useEffect(() => {
    if (requestData) {
      requestData("bookmarks");
    }
    if (sendToSocket) {
      sendToSocket({ type: "START_SUBSCRIPTION", channel: "bookmarks" });
    }
    return () => {
      if (sendToSocket) {
        sendToSocket({ type: "STOP_SUBSCRIPTION", channel: "bookmarks" });
      }
    };
  }, [requestData, sendToSocket]);

  // Root-level refresh logic: trigger onExit whenever the root view unmounts
  useEffect(() => {
    return () => {
      if (folderId === "root" && onExit) {
        onExit();
      }
    };
  }, [folderId, onExit]);

  const prefs = useMemo(() => getPreferenceValues(), []);
  const autoRedirect = prefs.autoRedirectBookmarks !== false;
  const targetFolderTitle = (
    prefs.bookmarksRedirectFolder || "Bookmarks Bar"
  ).toLowerCase();

  const bookmarksBarFolder = useMemo(() => {
    if (!autoRedirect) return null;
    return liveBookmarks.find((b: BookmarkItem) => {
      const titleLower = b.title.toLowerCase();
      const rawId = b.id.includes("-") ? b.id.split("-").pop() : b.id;
      return (
        titleLower.includes(targetFolderTitle) ||
        (targetFolderTitle === "bookmarks bar" && rawId === "1")
      );
    });
  }, [liveBookmarks, autoRedirect, targetFolderTitle]);

  const effectiveFolderId = useMemo(() => {
    if (folderId === "root" && !isShowingRoot && bookmarksBarFolder) {
      return bookmarksBarFolder.id;
    }
    return folderId;
  }, [folderId, isShowingRoot, bookmarksBarFolder]);

  const breadcrumb = useMemo(() => {
    const displayTitle =
      folderId === "root" && !isShowingRoot && bookmarksBarFolder
        ? bookmarksBarFolder.title
        : title;
    const fullPath = [...path, displayTitle];
    return fullPath.join(" > ");
  }, [path, title, isShowingRoot, bookmarksBarFolder, folderId]);

  const currentFolderBookmarks = useMemo(() => {
    if (effectiveFolderId === "root") return liveBookmarks;
    const folder = findFolderById(liveBookmarks, effectiveFolderId);
    return folder?.children || [];
  }, [liveBookmarks, effectiveFolderId]);

  const filteredBookmarks = useMemo(() => {
    let list = currentFolderBookmarks;

    // 1. Initial filter by browser (Only at the root level, deep children inherit the browser branch)
    if (effectiveFolderId === "root" && browserFilter !== "all") {
      list = list.filter((b: BookmarkItem) => b.browserType === browserFilter);
    }

    // 2. Local search across the current level
    if (searchText) {
      const lower = searchText.toLowerCase();
      list = list.filter(
        (b: BookmarkItem) =>
          b.title.toLowerCase().includes(lower) ||
          (b.url && b.url.toLowerCase().includes(lower)),
      );
    }

    return list;
  }, [currentFolderBookmarks, browserFilter, searchText, effectiveFolderId]);

  return (
    <List
      isLoading={false}
      searchBarPlaceholder={breadcrumb}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={title}
    >
      {filteredBookmarks.length === 0 ? (
        <List.EmptyView title="No Bookmarks Found" icon={Icon.Bookmark} />
      ) : (
        filteredBookmarks.map((item: BookmarkItem) => (
          <BookmarkRow
            key={item.id}
            item={item}
            browserFilter={browserFilter}
            bookmarks={liveBookmarks}
            currentParentId={effectiveFolderId}
            onOpenBookmark={onOpenBookmark}
            onDeleteBookmark={onDeleteBookmark}
            onMoveBookmark={onMoveBookmark}
            onRenameBookmark={onRenameBookmark}
            onOpenCurrentTab={onOpenCurrentTab}
            sendToSocket={sendToSocket}
            onPopToMain={() => {
              if (folderId === "root" && effectiveFolderId !== "root") {
                setIsShowingRoot(true);
              } else {
                pop();
              }
            }}
            isRedirectedRoot={
              folderId === "root" && effectiveFolderId !== "root"
            }
            path={[
              ...path,
              folderId === "root" && !isShowingRoot && bookmarksBarFolder
                ? bookmarksBarFolder.title
                : title,
            ]}
          />
        ))
      )}
    </List>
  );
}

function BookmarkRow({
  item,
  browserFilter,
  bookmarks,
  currentParentId,
  onOpenBookmark,
  onDeleteBookmark,
  onMoveBookmark,
  onRenameBookmark,
  onOpenCurrentTab,
  sendToSocket,
  onPopToMain,
  isRedirectedRoot,
  path,
}: {
  item: BookmarkItem;
  browserFilter: string;
  bookmarks: BookmarkItem[];
  currentParentId: string;
  onOpenBookmark: (url: string) => void;
  onDeleteBookmark: (
    id: string,
    isFolder: boolean,
    browserType?: string,
  ) => void;
  onMoveBookmark: (id: string, parentId: string) => void;
  onRenameBookmark: (id: string, newTitle: string) => void;
  onOpenCurrentTab?: (url: string) => void;
  sendToSocket?: (msg: BridgeMessage) => void;
  onPopToMain: () => void;
  isRedirectedRoot?: boolean;
  path: string[];
}) {
  const isFolder = !!item.children;
  // Root folders (0, 1, 2) and browser-prefixed versions cannot be renamed/deleted
  const rawId = item.id.includes("-") ? item.id.split("-").pop() : item.id;
  const isRootFolder = ["0", "1", "2"].includes(rawId || "");

  const handleDelete = async () => {
    if (
      await confirmAlert({
        title: `Delete ${isFolder ? "Folder" : "Bookmark"}`,
        message: `Are you sure you want to delete "${item.title}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      onDeleteBookmark(item.id, isFolder, item.browserType);
      showToast({ style: Toast.Style.Success, title: "Deleted Item" });
    }
  };

  return (
    <List.Item
      title={item.title}
      icon={getBookmarkIcon(item.url)}
      accessories={
        isFolder
          ? [
              {
                text: `${item.children?.length || 0} items`,
                icon: Icon.Folder,
                tooltip: item.url,
              },
            ]
          : [{ text: formatTimeAgo(item.dateAdded), tooltip: item.url }]
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Primary">
            {isFolder ? (
              <Action.Push
                title="Open Folder"
                icon={{ source: Icon.ArrowRight, tintColor: Color.Blue }}
                target={
                  <BookmarksView
                    folderId={item.id}
                    title={item.title}
                    browserFilter={browserFilter}
                    onOpenBookmark={onOpenBookmark}
                    onDeleteBookmark={onDeleteBookmark}
                    onMoveBookmark={onMoveBookmark}
                    onRenameBookmark={onRenameBookmark}
                    onOpenCurrentTab={onOpenCurrentTab}
                    bookmarks={bookmarks}
                    sendToSocket={sendToSocket}
                    path={path}
                  />
                }
              />
            ) : (
              <Action
                title="Open Bookmark"
                icon={{ source: Icon.Globe, tintColor: Color.Blue }}
                onAction={() => item.url && onOpenBookmark(item.url)}
              />
            )}
            {!isFolder && onOpenCurrentTab && (
              <Action
                title="Open in Current Tab"
                icon={{ source: Icon.Window, tintColor: Color.Blue }}
                shortcut={
                  getActionShortcut("searchCurrent") || {
                    modifiers: ["ctrl"],
                    key: "enter",
                  }
                }
                onAction={() => item.url && onOpenCurrentTab(item.url)}
              />
            )}
            {!isFolder && sendToSocket && item.url && (
              <Action
                title="Open in Background"
                icon={{ source: Icon.AppWindowList, tintColor: Color.Blue }}
                shortcut={{ modifiers: ["shift"], key: "enter" }}
                onAction={() => {
                  sendToSocket({
                    type: "CREATE_TAB_BACKGROUND",
                    url: item.url,
                    browser: item.browserType,
                  });
                  showToast({
                    style: Toast.Style.Success,
                    title: "Opened in background",
                    message: item.title,
                  });
                }}
              />
            )}
            <Action
              title={
                isRedirectedRoot
                  ? "Show All Folders"
                  : currentParentId === "root"
                    ? "Back to Tabs"
                    : "Back to Parent Folder"
              }
              icon={{ source: Icon.ArrowLeft, tintColor: Color.Blue }}
              shortcut={
                getActionShortcut("bookmarks") || {
                  modifiers: ["shift"],
                  key: "space",
                }
              }
              onAction={onPopToMain}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Organize">
            {!isRootFolder && (
              <Action.Push
                title="Rename"
                icon={{ source: Icon.Pencil, tintColor: Color.Orange }}
                shortcut={{ modifiers: ["ctrl"], key: "e" }}
                target={
                  <RenameBookmarkForm
                    bookmark={item}
                    onRename={onRenameBookmark}
                  />
                }
              />
            )}
            <BookmarkFolderPicker
              bookmarks={bookmarks}
              browserType={item.browserType}
              currentFolderId={isFolder ? item.id : undefined}
              currentParentId={currentParentId}
              actionTitle={
                isFolder ? "Move Folder to..." : "Move Bookmark to..."
              }
              icon={{ source: Icon.Folder, tintColor: Color.Orange }}
              onSelect={(folderId) => onMoveBookmark(item.id, folderId)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Utilities">
            {!isFolder && (
              <>
                <Action
                  title="Copy URL"
                  icon={{
                    source: Icon.CopyClipboard,
                    tintColor: Color.SecondaryText,
                  }}
                  shortcut={{ modifiers: ["shift"], key: "c" }}
                  {...({ autoCloseWindow: false, closeMainWindow: false } as {
                    autoCloseWindow?: boolean;
                    closeMainWindow?: boolean;
                  })}
                  onAction={async () => {
                    if (item.url) {
                      forceCopy(item.url);
                      showToast({
                        style: Toast.Style.Success,
                        title: `Copied URL`,
                        message: item.url,
                      });
                    }
                  }}
                />
                <Action
                  title="Copy as Markdown"
                  icon={{ source: Icon.Code, tintColor: Color.SecondaryText }}
                  shortcut={{ modifiers: ["shift"], key: "x" }}
                  {...({ autoCloseWindow: false, closeMainWindow: false } as {
                    autoCloseWindow?: boolean;
                    closeMainWindow?: boolean;
                  })}
                  onAction={async () => {
                    if (item.url) {
                      forceCopy(`[${item.title}](${item.url})`);
                      showToast({
                        style: Toast.Style.Success,
                        title: `Copied as Markdown:`,
                        message: item.url,
                      });
                    }
                  }}
                />
              </>
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Danger Zone">
            <Action
              title="Delete Bookmark"
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              style={Action.Style.Destructive}
              onAction={handleDelete}
              shortcut={{ modifiers: ["ctrl"], key: "d" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
