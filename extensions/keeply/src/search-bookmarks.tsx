import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  confirmAlert,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { KeeplyApi } from "./lib/api.js";
import type { Bookmark, Folder, Tag, UpdateBookmarkPayload } from "./lib/types.js";
import {
  formatMarkdownLink,
  formatRelativeDate,
  getDomain,
  getTagNames,
  isValidUrl,
  NO_FOLDER,
  resolveOrCreateTag,
  showApiError,
  toError,
} from "./lib/utils.js";

const api = new KeeplyApi();

export default function SearchBookmarks() {
  const [searchText, setSearchText] = useState("");
  const [filterValue, setFilterValue] = useState("all");
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const isSearchMode = searchText.length > 0;

  const {
    data: rawBookmarks,
    isLoading: allLoading,
    mutate,
  } = useCachedPromise(() => api.listBookmarks(), [], {
    onError: (error) => showApiError(error, () => mutate()),
  });
  const allBookmarks = Array.isArray(rawBookmarks) ? rawBookmarks : [];

  const { data: sidebar, mutate: sidebarMutate } = useCachedPromise(() => api.getSidebarData(), [], {
    onError: (error) => showApiError(error, () => sidebarMutate()),
  });

  const {
    data: searchResults = [],
    isLoading: searchLoading,
    mutate: searchMutate,
  } = useCachedPromise((query: string) => api.searchBookmarks(query), [searchText], {
    execute: isSearchMode,
    onError: (error) => showApiError(error, () => searchMutate()),
  });

  const isLoading = isSearchMode ? searchLoading : allLoading;

  const folderNameMap = useMemo(
    () => new Map<string, string>(sidebar?.folders.map((f: Folder) => [f.id, f.name]) ?? []),
    [sidebar],
  );

  const displayedBookmarks = useMemo(() => {
    if (isSearchMode) return searchResults;

    const active = allBookmarks.filter((b: Bookmark) => !b.deletedAt);

    if (filterValue === "archived") return active.filter((b: Bookmark) => b.archived);
    if (filterValue.startsWith("folder:")) {
      const id = filterValue.slice(7);
      return active.filter((b: Bookmark) => !b.archived && b.folderId === id);
    }
    if (filterValue.startsWith("tag:")) {
      const id = filterValue.slice(4);
      return active.filter(
        (b: Bookmark) => !b.archived && b.tags.some((t: Bookmark["tags"][number]) => t.tag.id === id),
      );
    }
    return active.filter((b: Bookmark) => !b.archived);
  }, [allBookmarks, searchResults, filterValue, isSearchMode]);

  const sections = useMemo(() => {
    if (isSearchMode || filterValue !== "all") return null;
    const map = new Map<string, Bookmark[]>();
    for (const b of displayedBookmarks) {
      const key = b.folderId ?? NO_FOLDER;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return map;
  }, [displayedBookmarks, isSearchMode, filterValue]);

  async function handleArchive(bookmark: Bookmark) {
    const archived = !bookmark.archived;
    const promise = api.updateBookmark(bookmark.id, { archived });
    try {
      await Promise.all([
        mutate(promise, {
          optimisticUpdate: (data: Bookmark[] | undefined) =>
            data?.map((b: Bookmark) => (b.id === bookmark.id ? { ...b, archived } : b)),
          rollbackOnError: true,
        }),
        searchMutate(promise, {
          optimisticUpdate: (data: Bookmark[] | undefined) =>
            data?.map((b: Bookmark) => (b.id === bookmark.id ? { ...b, archived } : b)),
          rollbackOnError: true,
        }),
      ]);
      await showToast({ style: Toast.Style.Success, title: archived ? "Archived" : "Unarchived" });
    } catch (error) {
      showApiError(toError(error));
    }
  }

  async function handleDelete(bookmark: Bookmark) {
    const confirmed = await confirmAlert({
      title: "Delete Bookmark",
      message: `Delete "${bookmark.title || getDomain(bookmark.url)}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const promise = api.deleteBookmark(bookmark.id);
    try {
      await Promise.all([
        mutate(promise, {
          optimisticUpdate: (data: Bookmark[] | undefined) => data?.filter((b: Bookmark) => b.id !== bookmark.id),
          rollbackOnError: true,
        }),
        searchMutate(promise, {
          optimisticUpdate: (data: Bookmark[] | undefined) => data?.filter((b: Bookmark) => b.id !== bookmark.id),
          rollbackOnError: true,
        }),
      ]);
      await showToast({ style: Toast.Style.Success, title: "Bookmark deleted" });
    } catch (error) {
      showApiError(toError(error));
    }
  }

  function bookmarkItem(bookmark: Bookmark) {
    const tagNames = getTagNames(bookmark);
    const domain = getDomain(bookmark.url);

    return (
      <List.Item
        key={bookmark.id}
        id={bookmark.id}
        title={bookmark.title || domain}
        subtitle={isShowingDetail ? undefined : domain}
        keywords={[...tagNames, domain]}
        accessories={
          isShowingDetail
            ? undefined
            : [
                ...tagNames.slice(0, 2).map((t: string) => ({ tag: { value: t, color: Color.Blue } })),
                ...(bookmark.archived
                  ? [{ icon: { source: Icon.Tray, tintColor: Color.Yellow }, tooltip: "Archived" }]
                  : []),
                { text: formatRelativeDate(bookmark.createdAt), tooltip: "Saved" },
              ]
        }
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Link title="URL" target={bookmark.url} text={bookmark.url} />
                {bookmark.description && (
                  <List.Item.Detail.Metadata.Label title="Description" text={bookmark.description} />
                )}
                {bookmark.note && <List.Item.Detail.Metadata.Label title="Note" text={bookmark.note} />}
                {tagNames.length > 0 && (
                  <List.Item.Detail.Metadata.TagList title="Tags">
                    {tagNames.map((t: string) => (
                      <List.Item.Detail.Metadata.TagList.Item key={t} text={t} color={Color.Blue} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                )}
                {(bookmark.folderId || bookmark.folder) &&
                  (() => {
                    const name =
                      (bookmark.folderId ? folderNameMap.get(bookmark.folderId) : undefined) ?? bookmark.folder?.name;
                    return name ? <List.Item.Detail.Metadata.Label title="Folder" text={name} /> : null;
                  })()}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Saved" text={formatRelativeDate(bookmark.createdAt)} />
                <List.Item.Detail.Metadata.Label title="Updated" text={formatRelativeDate(bookmark.updatedAt)} />
                {bookmark.archived && (
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text="Archived"
                    icon={{ source: Icon.Tray, tintColor: Color.Yellow }}
                  />
                )}
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.OpenInBrowser url={bookmark.url} />
              <Action.CopyToClipboard
                title="Copy URL"
                content={bookmark.url}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy as Markdown Link"
                content={formatMarkdownLink(bookmark)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action
                title={isShowingDetail ? "Hide Detail" : "Show Detail"}
                icon={Icon.Sidebar}
                onAction={() => setIsShowingDetail((v) => !v)}
                shortcut={{ modifiers: ["cmd"], key: "y" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Manage">
              <Action.Push
                title="Edit Bookmark"
                icon={Icon.Pencil}
                target={
                  <EditBookmarkView
                    bookmark={bookmark}
                    sidebar={sidebar}
                    onSave={() => {
                      mutate();
                      searchMutate();
                    }}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action
                title={bookmark.archived ? "Unarchive" : "Archive"}
                icon={Icon.Tray}
                onAction={() => handleArchive(bookmark)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Delete Bookmark"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(bookmark)}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  const filterDropdown = (
    <List.Dropdown tooltip="Filter" value={filterValue} onChange={setFilterValue}>
      <List.Dropdown.Item title="All Bookmarks" value="all" />
      <List.Dropdown.Item title="Archived" value="archived" />
      {sidebar && sidebar.folders.length > 0 && (
        <List.Dropdown.Section title="Folders">
          {sidebar.folders.map((f: Folder) => (
            <List.Dropdown.Item key={f.id} title={`${f.name} (${f._count?.bookmarks ?? 0})`} value={`folder:${f.id}`} />
          ))}
        </List.Dropdown.Section>
      )}
      {sidebar && sidebar.tags.length > 0 && (
        <List.Dropdown.Section title="Tags">
          {sidebar.tags.map((t: Tag) => (
            <List.Dropdown.Item key={t.id} title={`${t.name} (${t.count})`} value={`tag:${t.id}`} />
          ))}
        </List.Dropdown.Section>
      )}
    </List.Dropdown>
  );

  const emptyTitle = isSearchMode
    ? `No results for "${searchText}"`
    : filterValue !== "all"
      ? "No bookmarks match this filter"
      : "No bookmarks yet";

  const emptyDescription = isSearchMode
    ? "Try a different search term"
    : filterValue !== "all"
      ? ""
      : "Press ⌘N to save your first bookmark";

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
      searchBarPlaceholder="Search bookmarks..."
      searchBarAccessory={filterDropdown}
    >
      {displayedBookmarks.length === 0 && !isLoading ? (
        <List.EmptyView title={emptyTitle} description={emptyDescription} icon={Icon.Bookmark} />
      ) : sections ? (
        Array.from(sections.entries())
          .filter(([, items]) => items.length > 0)
          .map(([sectionKey, items]: [string, Bookmark[]]) => (
            <List.Section
              key={sectionKey}
              title={sectionKey === NO_FOLDER ? "Unsorted" : (folderNameMap.get(sectionKey) ?? "Unknown Folder")}
              subtitle={String(items.length)}
            >
              {items.map(bookmarkItem)}
            </List.Section>
          ))
      ) : (
        displayedBookmarks.map(bookmarkItem)
      )}
    </List>
  );
}

interface EditBookmarkViewProps {
  bookmark: Bookmark;
  sidebar?: { folders: Folder[]; tags: Tag[] };
  onSave: () => void;
}

interface EditFormValues {
  url: string;
  title: string;
  description: string;
  note: string;
  folderId: string;
  tagIds: string[];
  newTagName: string;
}

function EditBookmarkView({ bookmark, sidebar, onSave }: EditBookmarkViewProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: EditFormValues) {
    if (!isValidUrl(values.url)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Must start with http:// or https://",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving changes..." });

    try {
      const extraTagId = await resolveOrCreateTag(values.newTagName, sidebar, (name: string) => api.createTag(name));

      const payload: UpdateBookmarkPayload = {
        url: values.url,
        title: values.title || undefined,
        description: values.description || undefined,
        note: values.note || undefined,
        folderId: values.folderId === NO_FOLDER ? null : values.folderId,
        tagIds: extraTagId ? [...values.tagIds, extraTagId] : values.tagIds,
      };

      await api.updateBookmark(bookmark.id, payload);

      toast.style = Toast.Style.Success;
      toast.title = "Bookmark updated";

      onSave();
      pop();
    } catch (error) {
      const err = toError(error);
      toast.style = Toast.Style.Failure;
      toast.title = err.message;
      const isAuthError = err.message.includes("API key") || err.message.includes("scope");
      if (isAuthError) {
        toast.primaryAction = { title: "Open Preferences", onAction: openExtensionPreferences };
      }
    }
  }

  return (
    <Form
      navigationTitle="Edit Bookmark"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" defaultValue={bookmark.url} />
      <Form.TextField id="title" title="Title" defaultValue={bookmark.title ?? ""} placeholder="Page title" />
      <Form.TextField
        id="description"
        title="Description"
        defaultValue={bookmark.description ?? ""}
        placeholder="Short description"
      />
      <Form.TextArea id="note" title="Note" defaultValue={bookmark.note ?? ""} placeholder="Personal note..." />
      <Form.Separator />
      <Form.Dropdown id="folderId" title="Folder" defaultValue={bookmark.folderId ?? NO_FOLDER}>
        <Form.Dropdown.Item title="No folder (Unsorted)" value={NO_FOLDER} />
        {sidebar?.folders.map((f: Folder) => (
          <Form.Dropdown.Item key={f.id} title={f.name} value={f.id} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker
        id="tagIds"
        title="Tags"
        defaultValue={bookmark.tags.map((t: Bookmark["tags"][number]) => t.tag.id)}
      >
        {sidebar?.tags.map((t: Tag) => (
          <Form.TagPicker.Item key={t.id} title={t.name} value={t.id} />
        ))}
      </Form.TagPicker>
      <Form.TextField id="newTagName" title="Create New Tag" placeholder="Type a new tag name to create it on save" />
    </Form>
  );
}
