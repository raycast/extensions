import { useState, useEffect, useCallback } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import {
  getCollections,
  getCollectionRaindrops,
  getChildCollections,
} from "./api";
import type { RaindropCollection, RaindropBookmark } from "./types";

export default function BrowseCollections() {
  const [collections, setCollections] = useState<RaindropCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] =
    useState<RaindropCollection | null>(null);
  const [bookmarks, setBookmarks] = useState<RaindropBookmark[]>([]);
  const [childCollections, setChildCollections] = useState<
    RaindropCollection[]
  >([]);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [selectedBookmark, setSelectedBookmark] =
    useState<RaindropBookmark | null>(null);

  // Load root collections on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await getCollections();
        if (res.result) {
          setCollections(res.items);
        }
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load collections",
          message: String(err),
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Load bookmarks when a collection is selected
  const handleCollectionSelect = useCallback(
    async (collection: RaindropCollection) => {
      setSelectedCollection(collection);
      setIsLoadingBookmarks(true);
      try {
        const [raindropsRes, childrenRes] = await Promise.all([
          getCollectionRaindrops(collection._id),
          getChildCollections(collection._id).catch(() => ({
            result: false,
            items: [],
          })),
        ]);
        if (raindropsRes.result) {
          setBookmarks(raindropsRes.items);
        }
        if (childrenRes.result) {
          setChildCollections(childrenRes.items);
        }
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load bookmarks",
          message: String(err),
        });
      } finally {
        setIsLoadingBookmarks(false);
      }
    },
    [],
  );

  // Collection list view (initial)
  if (!selectedCollection) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Filter collections…">
        {collections.length === 0 && !isLoading ? (
          <List.EmptyView
            title="No Collections"
            description="No collections found in your Raindrop account"
            icon={Icon.Folder}
          />
        ) : (
          collections.map((col) => (
            <List.Item
              key={col._id}
              id={String(col._id)}
              title={col.title}
              icon={
                col.color
                  ? { source: Icon.Folder, tintColor: col.color }
                  : Icon.Folder
              }
              accessories={[{ text: `${col.count}` }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Browse Collection"
                    icon={Icon.ArrowRight}
                    onAction={() => handleCollectionSelect(col)}
                  />
                  <Action.OpenInBrowser
                    title="Open in Raindrop"
                    url={`https://app.raindrop.io/my/${col._id}`}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List>
    );
  }

  // Bookmark list view (inside a collection)
  return (
    <List
      isLoading={isLoadingBookmarks}
      navigationTitle={selectedCollection.title}
      searchBarPlaceholder="Filter bookmarks…"
      isShowingDetail={!!selectedBookmark}
      onSelectionChange={(id) => {
        if (!id) {
          setSelectedBookmark(null);
          return;
        }
        const bm = bookmarks.find((b) => String(b._id) === id);
        setSelectedBookmark(bm ?? null);
      }}
    >
      <List.EmptyView
        title="No Bookmarks"
        description="This collection is empty"
        icon={Icon.Bookmark}
      />
      {childCollections.length > 0 && (
        <List.Section title="Sub-collections">
          {childCollections.map((col) => (
            <List.Item
              key={`col-${col._id}`}
              id={`col-${col._id}`}
              title={col.title}
              icon={
                col.color
                  ? { source: Icon.Folder, tintColor: col.color }
                  : Icon.Folder
              }
              accessories={[{ text: `${col.count}` }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Browse Collection"
                    icon={Icon.ArrowRight}
                    onAction={() => handleCollectionSelect(col)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {bookmarks.length > 0 && (
        <List.Section title="Bookmarks">
          {bookmarks.map((bookmark) => (
            <List.Item
              key={bookmark._id}
              id={String(bookmark._id)}
              title={bookmark.title}
              icon={
                bookmark.cover || bookmark.highLevel?.cover
                  ? {
                      source: bookmark.cover || bookmark.highLevel?.cover || "",
                    }
                  : Icon.Globe
              }
              accessories={
                bookmark.tags.length > 0 ? [{ tag: bookmark.tags[0] }] : []
              }
              detail={
                <List.Item.Detail
                  markdown={`# ${bookmark.title}\n\n${bookmark.excerpt || ""}${bookmark.cover ? `\n\n![cover](${bookmark.cover})` : ""}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="URL"
                        text={bookmark.link}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Type"
                        text={bookmark.type || "link"}
                      />
                      {bookmark.tags.length > 0 && (
                        <List.Item.Detail.Metadata.TagList title="Tags">
                          {bookmark.tags.map((tag) => (
                            <List.Item.Detail.Metadata.TagList.Item
                              key={tag}
                              text={tag}
                            />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      )}
                      {bookmark.note && (
                        <List.Item.Detail.Metadata.Label
                          title="Note"
                          text={bookmark.note}
                        />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Bookmark"
                    url={bookmark.link}
                  />
                  <Action
                    title="Copy URL"
                    icon={Icon.Clipboard}
                    onAction={() => Clipboard.copy(bookmark.link)}
                  />
                  <Action.OpenInBrowser
                    title="Open in Raindrop"
                    url={`https://app.raindrop.io/my/${bookmark._id}`}
                  />
                  <ActionPanel.Section title="Navigation">
                    <Action
                      title="Back to Collections"
                      icon={Icon.ArrowLeft}
                      onAction={() => {
                        setSelectedCollection(null);
                        setBookmarks([]);
                        setChildCollections([]);
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
