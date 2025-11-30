import { List, ActionPanel, Action, Icon, confirmAlert, Alert, showToast, Toast, Color } from "@raycast/api";
import { useState } from "react";
import { useStorage } from "./hooks/useStorage";
import { CreateTag } from "./components/create-tag";
import { EditTag } from "./components/edit-tag";
import { CreateTagGroup } from "./components/create-tag-group";
import { EditTagGroup } from "./components/edit-tag-group";
import { Tag, TagGroup } from "./types";

export default function ManageTags() {
  const { data, getTagStats, deleteTag, isLoading, reloadData, getTagsByGroup, deleteTagGroup } = useStorage();
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<"flat" | "grouped">("grouped");

  const tagStats = getTagStats();
  const tagsByGroup = getTagsByGroup();

  async function handleDeleteTag(tagId: string, tagName: string, count: number) {
    const confirmed = await confirmAlert({
      title: `Delete tag "${tagName}"?`,
      message:
        count > 0
          ? `This will remove the tag from ${count} bookmark${count !== 1 ? "s" : ""}`
          : "This tag is not used by any bookmarks",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await deleteTag(tagId);
      await showToast({
        style: Toast.Style.Success,
        title: "Tag deleted",
        message: `"${tagName}" removed`,
      });
      await reloadData();
    }
  }

  async function handleDeleteGroup(groupId: string, groupName: string, tagCount: number) {
    const confirmed = await confirmAlert({
      title: `Delete group "${groupName}"?`,
      message:
        tagCount > 0
          ? `${tagCount} tag${tagCount !== 1 ? "s" : ""} will be ungrouped but not deleted`
          : "This group is empty",
      primaryAction: {
        title: "Delete Group",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await deleteTagGroup(groupId);
      await showToast({
        style: Toast.Style.Success,
        title: "Group deleted",
        message: `"${groupName}" removed`,
      });
      await reloadData();
    }
  }

  // Filter tags based on search
  const filterTags = (tags: typeof data.tags) => {
    if (!searchText) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(searchText.toLowerCase()));
  };

  const handleUpdated = async () => {
    await reloadData();
  };

  const renderActionPanel = () => (
    <ActionPanel>
      <Action.Push
        title="Create New Tag"
        icon={Icon.Plus}
        target={<CreateTag onCreated={handleUpdated} />}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
      />
      <Action.Push
        title="Create New Group"
        icon={Icon.PlusSquare}
        target={<CreateTagGroup />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
      />
    </ActionPanel>
  );

  const renderFlatActionPanel = (tag: Tag, stats: { count: number } | undefined) => (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Push
          title="Edit Tag"
          icon={Icon.Pencil}
          target={<EditTag tag={tag} />}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Create New Tag"
          icon={Icon.Plus}
          target={<CreateTag />}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
        <Action.Push
          title="Create New Group"
          icon={Icon.PlusSquare}
          target={<CreateTagGroup />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Tag"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => handleDeleteTag(tag.id, tag.name, stats?.count || 0)}
          shortcut={{ modifiers: ["cmd"], key: "delete" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  const renderUngroupedActionPanel = (tag: Tag, stats: { count: number } | undefined) => (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Push
          title="Edit Tag"
          icon={Icon.Pencil}
          target={<EditTag tag={tag} />}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Create New Tag"
          icon={Icon.Plus}
          target={<CreateTag />}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
        <Action.Push
          title="Create New Group"
          icon={Icon.PlusSquare}
          target={<CreateTagGroup />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Tag"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => handleDeleteTag(tag.id, tag.name, stats?.count || 0)}
          shortcut={{ modifiers: ["cmd"], key: "delete" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  const renderGroupedActionPanel = (
    tag: Tag,
    group: TagGroup,
    groupTags: Tag[],
    stats: { count: number } | undefined,
  ) => (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Push
          title="View Bookmarks with Tag"
          icon={Icon.List}
          target={<BookmarksWithTag tagId={tag.id} tagName={tag.name} />}
          shortcut={{ modifiers: ["cmd"], key: "b" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Edit Tag"
          icon={Icon.Pencil}
          target={<EditTag tag={tag} onUpdated={handleUpdated} />}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
        />
        <Action.Push
          title="Edit Group"
          icon={Icon.Pencil}
          target={<EditTagGroup group={group} onUpdated={handleUpdated} />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Create New Tag"
          icon={Icon.Plus}
          target={<CreateTag defaultGroupId={group.id} onCreated={handleUpdated} />}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
        <Action.Push
          title="Create New Group"
          icon={Icon.PlusSquare}
          target={<CreateTagGroup onCreated={handleUpdated} />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Tag"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => handleDeleteTag(tag.id, tag.name, stats?.count || 0)}
          shortcut={{ modifiers: ["cmd"], key: "delete" }}
        />
        <Action
          title="Delete Group"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => handleDeleteGroup(group.id, group.name, groupTags.length)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tags..."
      onSearchTextChange={setSearchText}
      actions={renderActionPanel()}
      searchBarAccessory={
        <List.Dropdown
          tooltip="View Mode"
          value={viewMode}
          onChange={(newValue) => setViewMode(newValue as "grouped" | "flat")}
        >
          <List.Dropdown.Item title="Grouped View" value="grouped" icon={Icon.AppWindowGrid2x2} />
          <List.Dropdown.Item title="Flat View" value="flat" icon={Icon.List} />
        </List.Dropdown>
      }
    >
      {viewMode === "grouped" ? (
        <>
          {/* Tag Groups */}
          {(data.tagGroups || []).map((group) => {
            const groupTags = filterTags(tagsByGroup.get(group.id) || []);
            if (searchText && groupTags.length === 0) return null;

            return (
              <List.Section key={group.id} title={group.name} subtitle={group.description}>
                {groupTags.map((tag) => {
                  const stats = tagStats.get(tag.id);
                  return (
                    <List.Item
                      key={tag.id}
                      title={tag.name}
                      subtitle={tag.description || ""}
                      icon={{
                        source: Icon.Tag,
                        tintColor: tag.color || Color.Blue,
                      }}
                      accessories={[
                        {
                          text: `${stats?.count || 0} bookmark${stats?.count !== 1 ? "s" : ""}`,
                          icon: Icon.Link,
                        },
                      ]}
                      actions={renderGroupedActionPanel(tag, group, groupTags, stats)}
                    />
                  );
                })}
              </List.Section>
            );
          })}

          {/* Ungrouped Tags */}
          {(() => {
            const ungroupedTags = filterTags(tagsByGroup.get(undefined) || []);
            if (ungroupedTags.length === 0) return null;

            return (
              <List.Section title="Ungrouped Tags">
                {ungroupedTags.map((tag) => {
                  const stats = tagStats.get(tag.id);
                  return (
                    <List.Item
                      key={tag.id}
                      title={tag.name}
                      subtitle={tag.description || ""}
                      icon={{
                        source: Icon.Tag,
                        tintColor: tag.color || Color.Blue,
                      }}
                      accessories={[
                        {
                          text: `${stats?.count || 0} bookmark${stats?.count !== 1 ? "s" : ""}`,
                          icon: Icon.Link,
                        },
                      ]}
                      actions={renderUngroupedActionPanel(tag, stats)}
                    />
                  );
                })}
              </List.Section>
            );
          })()}
        </>
      ) : (
        // Flat view - all tags in one list
        <List.Section title={`${filterTags(data.tags).length} Tags`}>
          {filterTags(data.tags)
            .sort((a, b) => {
              const statsA = tagStats.get(a.id);
              const statsB = tagStats.get(b.id);
              const countA = statsA?.count || 0;
              const countB = statsB?.count || 0;
              if (countB !== countA) return countB - countA;
              return a.name.localeCompare(b.name);
            })
            .map((tag) => {
              const stats = tagStats.get(tag.id);
              const group = tag.groupId ? (data.tagGroups || []).find((g) => g.id === tag.groupId) : undefined;

              return (
                <List.Item
                  key={tag.id}
                  title={tag.name}
                  subtitle={tag.description || ""}
                  icon={{
                    source: Icon.Tag,
                    tintColor: tag.color || Color.Blue,
                  }}
                  accessories={[
                    ...(group ? [{ tag: group.name, icon: Icon.Folder }] : []),
                    {
                      text: `${stats?.count || 0} bookmark${stats?.count !== 1 ? "s" : ""}`,
                      icon: Icon.Link,
                    },
                  ]}
                  actions={renderFlatActionPanel(tag, stats)}
                />
              );
            })}
        </List.Section>
      )}
    </List>
  );
}

// Component to show bookmarks with a specific tag
function BookmarksWithTag({ tagId, tagName }: { tagId: string; tagName: string }) {
  const { data, getTagsForBookmark } = useStorage();
  const bookmarksWithTag = data.bookmarks.filter((bookmark) => bookmark.tagIds.includes(tagId));

  return (
    <List navigationTitle={`Bookmarks tagged "${tagName}"`}>
      {bookmarksWithTag.length === 0 ? (
        <List.EmptyView
          title="No bookmarks with this tag"
          description="This tag hasn't been applied to any bookmarks yet"
        />
      ) : (
        bookmarksWithTag.map((bookmark) => {
          const bookmarkTags = getTagsForBookmark(bookmark);

          return (
            <List.Item
              key={bookmark.id}
              title={bookmark.title}
              subtitle={bookmark.url}
              icon={bookmark.favicon || Icon.Link}
              accessories={[
                ...bookmarkTags
                  .filter((t) => t.id !== tagId)
                  .map((tag) => ({
                    tag: tag.name,
                    icon: { source: Icon.Tag, tintColor: tag.color || Color.Blue },
                  })),
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={bookmark.url} />
                  <Action.CopyToClipboard content={bookmark.url} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
