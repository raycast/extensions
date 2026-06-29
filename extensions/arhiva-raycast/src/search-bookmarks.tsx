import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { AuthGate } from "./components/auth-gate";
import { BookmarkForm } from "./components/bookmark-form";
import {
  createBookmarkLibraryModel,
  serializeList,
  stripTagTokens,
  type BookmarkLibraryFolder,
} from "./lib/bookmark-library-model";
import {
  archiveBookmark,
  getDashboardSnapshot,
  restoreBookmark,
  setBookmarkFavorite,
  setBookmarkRead,
  type Bookmark,
  type DashboardSnapshot,
} from "./lib/bookmarks";
import { getErrorMessage } from "./lib/errors";
import { getWebAppUrl } from "./lib/preferences";
import { extractTagTokens, getHostnameLabel } from "./lib/utils";

type ViewState =
  | Readonly<{ status: "loading"; snapshot?: DashboardSnapshot }>
  | Readonly<{ status: "loaded"; snapshot: DashboardSnapshot }>
  | Readonly<{ status: "error"; message: string }>;

const allActiveFilter = "__active__";
const noCollectionFilter = "__none__";
const trashFilter = "__trash__";
const recentBookmarkLimit = 20;

function getBookmarkTitle(bookmark: Bookmark) {
  const title = bookmark.title?.trim();
  return title != null && title.length > 0 ? title : getHostnameLabel(bookmark.url);
}

function BookmarkDetails({
  bookmark,
  collectionName,
}: Readonly<{ bookmark: Bookmark; collectionName?: string }>) {
  const markdown = [
    `# ${getBookmarkTitle(bookmark)}`,
    bookmark.description,
    bookmark.notes == null ? undefined : `## Notes\n${bookmark.notes}`,
  ]
    .filter((value): value is string => value != null && value.length > 0)
    .join("\n\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="URL" text={bookmark.url} />
          <Detail.Metadata.Label title="Host" text={getHostnameLabel(bookmark.url)} />
          {collectionName != null ? (
            <Detail.Metadata.Label title="Collection" text={collectionName} />
          ) : null}
          <Detail.Metadata.Label title="Read" text={bookmark.isRead ? "Yes" : "No"} />
          <Detail.Metadata.Label title="Favorite" text={bookmark.isFavorite ? "Yes" : "No"} />
          {bookmark.tags.length > 0 ? (
            <Detail.Metadata.TagList title="Tags">
              {bookmark.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={bookmark.url} />
          <Action.CopyToClipboard title="Copy URL" content={bookmark.url} />
        </ActionPanel>
      }
    />
  );
}

function BookmarkActions({
  bookmark,
  collectionName,
  isArchived,
  revalidate,
}: Readonly<{
  bookmark: Bookmark;
  collectionName?: string;
  isArchived: boolean;
  revalidate: () => Promise<void>;
}>) {
  async function runAction(title: string, operation: () => Promise<unknown>) {
    const toast = await showToast(Toast.Style.Animated, title);
    try {
      await operation();
      await revalidate();
      toast.style = Toast.Style.Success;
      toast.title = title;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Action failed";
      toast.message = getErrorMessage(error, "Unable to update bookmark.");
    }
  }

  return (
    <ActionPanel>
      <Action.OpenInBrowser url={bookmark.url} />
      <Action.CopyToClipboard title="Copy URL" content={bookmark.url} />
      <Action.Push
        title="Show Details"
        icon={Icon.Sidebar}
        target={<BookmarkDetails bookmark={bookmark} collectionName={collectionName} />}
      />
      {!isArchived ? (
        <>
          <Action.Push
            title="Edit Bookmark"
            icon={Icon.Pencil}
            target={<BookmarkForm bookmark={bookmark} onSaved={() => void revalidate()} />}
          />
          <Action
            title={bookmark.isRead ? "Mark as Unread" : "Mark as Read"}
            icon={bookmark.isRead ? Icon.Circle : Icon.CheckCircle}
            onAction={() =>
              void runAction(
                bookmark.isRead ? "Marked as unread" : "Marked as read",
                async () => await setBookmarkRead(bookmark._id, !bookmark.isRead),
              )
            }
          />
          <Action
            title={bookmark.isFavorite ? "Remove Favorite" : "Add Favorite"}
            icon={bookmark.isFavorite ? Icon.StarDisabled : Icon.Star}
            onAction={() =>
              void runAction(
                bookmark.isFavorite ? "Removed favorite" : "Added favorite",
                async () => await setBookmarkFavorite(bookmark._id, !bookmark.isFavorite),
              )
            }
          />
          <Action
            title="Move to Trash"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() =>
              void runAction("Moved to trash", async () => await archiveBookmark(bookmark._id))
            }
          />
        </>
      ) : (
        <Action
          title="Restore Bookmark"
          icon={Icon.RotateClockwise}
          onAction={() =>
            void runAction("Restored bookmark", async () => await restoreBookmark(bookmark._id))
          }
        />
      )}
      <Action.OpenInBrowser title="Open Arhiva" url={getWebAppUrl("/app")} />
    </ActionPanel>
  );
}

function getBookmarkLibraryFolder(filter: string): BookmarkLibraryFolder | undefined {
  if (filter === noCollectionFilter) {
    return "unassigned";
  }
  if (filter === trashFilter) {
    return "trash";
  }
  return undefined;
}

function getBookmarkLibrarySearch(filter: string, searchText: string) {
  const collectionId =
    filter !== allActiveFilter && filter !== noCollectionFilter && filter !== trashFilter
      ? filter
      : undefined;

  return {
    q: stripTagTokens(searchText),
    tags: serializeList(extractTagTokens(searchText)),
    collections: collectionId,
    folder: getBookmarkLibraryFolder(filter),
  };
}

function getSectionTitle(
  filter: string,
  hasSearchText: boolean,
  collectionName: string | undefined,
) {
  if (hasSearchText) {
    return "Search Results";
  }
  if (filter === trashFilter) {
    return "Recently Deleted";
  }
  if (filter === noCollectionFilter) {
    return "Recent Unassigned Bookmarks";
  }
  if (collectionName !== undefined) {
    return `Recent in ${collectionName}`;
  }
  return "Recent Bookmarks";
}

function getEmptyTitle(filter: string, hasSearchText: boolean) {
  if (hasSearchText) {
    return "No Bookmarks Found";
  }
  if (filter === trashFilter) {
    return "Trash Is Empty";
  }
  if (filter === noCollectionFilter) {
    return "No Unassigned Bookmarks";
  }
  return "No Recent Bookmarks";
}

function getEmptyDescription(hasSearchText: boolean) {
  return hasSearchText
    ? "Try a different title, URL, description, or #tag."
    : "Saved bookmarks will appear here.";
}

function BookmarkList() {
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const [filter, setFilter] = useState(allActiveFilter);
  const [searchText, setSearchText] = useState("");

  async function load() {
    setState((current) => ({
      status: "loading",
      snapshot:
        current.status === "loaded" || current.status === "loading" ? current.snapshot : undefined,
    }));
    try {
      const snapshot = await getDashboardSnapshot();
      setState({ status: "loaded", snapshot });
    } catch (error) {
      setState({
        status: "error",
        message: getErrorMessage(error, "Unable to load bookmarks."),
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const snapshot = state.status === "error" ? undefined : state.snapshot;
  const model = useMemo(
    () =>
      snapshot === undefined
        ? null
        : createBookmarkLibraryModel<Bookmark>({
            search: getBookmarkLibrarySearch(filter, searchText),
            data: snapshot,
          }),
    [filter, searchText, snapshot],
  );
  const hasSearchText = searchText.trim().length > 0;
  const visibleBookmarks = model?.dashboard.visibleBookmarks ?? [];
  const bookmarks = hasSearchText
    ? visibleBookmarks
    : visibleBookmarks.slice(0, recentBookmarkLimit);
  const collectionNameById = model?.dashboard.collectionNameById;
  const selectedCollectionName =
    filter !== allActiveFilter && filter !== noCollectionFilter && filter !== trashFilter
      ? collectionNameById?.get(filter)
      : undefined;
  const isArchived = model?.dashboard.isTrash ?? filter === trashFilter;
  const sectionSubtitle =
    model === null || bookmarks.length === visibleBookmarks.length
      ? undefined
      : `${bookmarks.length} of ${visibleBookmarks.length}`;

  if (state.status === "error") {
    return <Detail markdown={`# Unable to Load Bookmarks\n\n${state.message}`} />;
  }

  return (
    <List
      isLoading={state.status === "loading"}
      searchBarPlaceholder="Search title, URL, description, or #tag"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Collection" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All Active" value={allActiveFilter} />
          <List.Dropdown.Item title="No Collection" value={noCollectionFilter} />
          {snapshot?.collections.map((collection) => (
            <List.Dropdown.Item
              key={collection.id}
              title={collection.name}
              value={String(collection.id)}
            />
          ))}
          <List.Dropdown.Item title="Trash" value={trashFilter} />
        </List.Dropdown>
      }
    >
      {snapshot !== undefined && bookmarks.length === 0 ? (
        <List.EmptyView
          title={getEmptyTitle(filter, hasSearchText)}
          description={getEmptyDescription(hasSearchText)}
        />
      ) : null}
      {bookmarks.length > 0 ? (
        <List.Section
          title={getSectionTitle(filter, hasSearchText, selectedCollectionName)}
          subtitle={sectionSubtitle}
        >
          {bookmarks.map((bookmark) => {
            const collectionName =
              bookmark.collectionId == null
                ? undefined
                : collectionNameById?.get(String(bookmark.collectionId));
            return (
              <List.Item
                key={bookmark._id}
                title={getBookmarkTitle(bookmark)}
                subtitle={bookmark.description ?? getHostnameLabel(bookmark.url)}
                icon={bookmark.favicon ?? Icon.Link}
                accessories={[
                  ...(collectionName == null ? [] : [{ text: collectionName }]),
                  ...(bookmark.isFavorite ? [{ icon: Icon.Star }] : []),
                  ...(bookmark.isRead ? [{ icon: Icon.CheckCircle }] : []),
                  { date: new Date(bookmark.updatedAt) },
                ]}
                actions={
                  <BookmarkActions
                    bookmark={bookmark}
                    collectionName={collectionName}
                    isArchived={isArchived}
                    revalidate={load}
                  />
                }
              />
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
}

export default function Command() {
  return (
    <AuthGate>
      <BookmarkList />
    </AuthGate>
  );
}
