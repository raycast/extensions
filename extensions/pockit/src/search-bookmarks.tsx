import { List, ActionPanel, Action, Icon, Image, Color } from "@raycast/api";
import { useState } from "react";
import { useStorage } from "./hooks/useStorage";
import { EditBookmark } from "./components/edit-bookmark";
import { Bookmark } from "./types";

export default function SearchBookmarksView() {
  const { data, deleteBookmark, getTagsForBookmark, isLoading, reloadData } = useStorage();
  const [selectedTagId, setSelectedTagId] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  const filteredBookmarks = data.bookmarks.filter((bookmark) => {
    const matchesTag = selectedTagId === "all" || bookmark.tagIds.includes(selectedTagId);

    const linkTags = getTagsForBookmark(bookmark);
    const matchesSearch =
      searchText === "" ||
      bookmark.title.toLowerCase().includes(searchText.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(searchText.toLowerCase()) ||
      bookmark.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      linkTags.some((tag) => tag.name.toLowerCase().includes(searchText.toLowerCase()));

    return matchesTag && matchesSearch;
  });

  const handleEdit = async () => {
    await reloadData();
  };

  const renderActionPanel = (bookmark: Bookmark) => (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={bookmark.url} />
        <Action.Push
          title="Edit Bookmark"
          icon={Icon.Pencil}
          target={<EditBookmark bookmark={bookmark} onEdit={handleEdit} />}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy URL" content={bookmark.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        <Action.CopyToClipboard
          title="Copy Title"
          content={bookmark.title}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        {bookmark.description && <Action.CopyToClipboard title="Copy Description" content={bookmark.description} />}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Delete Bookmark"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={async () => {
            await deleteBookmark(bookmark.id);
          }}
          shortcut={{ modifiers: ["cmd"], key: "delete" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search links..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={selectedTagId} onChange={setSelectedTagId}>
          <List.Dropdown.Section title="Tags">
            <List.Dropdown.Item title="All Tags" value="all" icon={Icon.Tag} />
            {data.tags.map((tag) => (
              <List.Dropdown.Item
                key={tag.id}
                title={tag.name}
                value={tag.id}
                icon={{ source: Icon.Tag, tintColor: tag.color || Color.Blue }}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredBookmarks.length === 0 ? (
        <List.EmptyView title="No links found" description="Try adjusting your filters or add a new link" />
      ) : (
        filteredBookmarks.map((bookmark) => {
          const bookmarkTags = getTagsForBookmark(bookmark);

          return (
            <List.Item
              key={bookmark.id}
              title={bookmark.title}
              subtitle={bookmark.url}
              icon={bookmark.favicon ? { source: bookmark.favicon, mask: Image.Mask.RoundedRectangle } : Icon.Link}
              accessories={[
                ...bookmarkTags.map((tag) => ({
                  tag: {
                    value: `#${tag.name}`,
                    color: tag.color || Color.Blue,
                  },
                })),
              ]}
              actions={renderActionPanel(bookmark)}
            />
          );
        })
      )}
    </List>
  );
}
