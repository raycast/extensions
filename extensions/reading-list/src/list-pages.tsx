import { Action, ActionPanel, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { TagForm, useTag } from "./features/tag";
import { Page } from "./types";

export default function Command() {
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("status:all");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const { tags, createTag, updatePageTags } = useTag();

  const [filterType, filterValue] = filter.split(":");
  const status = filterType === "status" ? filterValue : "all";
  const selectedTagId = filterType === "tag" ? filterValue : "all";
  const sortOrder = filterType === "sort" ? filterValue : "newest";

  useEffect(() => {
    loadPages();
  }, []);

  async function loadPages() {
    try {
      const pagesData = await LocalStorage.getItem<string>("pages");
      const pagesArray = pagesData ? JSON.parse(pagesData) : [];
      const normalizedPages = pagesArray.map((page: Page) => ({
        ...page,
        isRead: page.isRead ?? false,
        tagIds: page.tagIds ?? [],
      }));
      setPages(normalizedPages);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load data!",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdatePageTags(url: string, newTagIds: string[]) {
    const success = await updatePageTags(url, newTagIds);
    if (success) {
      const updatedPages = pages.map((page) => (page.url === url ? { ...page, tagIds: newTagIds } : page));
      setPages(updatedPages);
    }
  }

  async function markPageAsRead(url: string) {
    const updatedPages = pages.map((page) => (page.url === url ? { ...page, isRead: true } : page));
    setPages(updatedPages);
    await LocalStorage.setItem("pages", JSON.stringify(updatedPages));
  }

  async function markPageAsUnread(url: string) {
    const updatedPages = pages.map((page) => (page.url === url ? { ...page, isRead: false } : page));
    setPages(updatedPages);
    await LocalStorage.setItem("pages", JSON.stringify(updatedPages));
  }

  async function deletePage(url: string) {
    const updatedPages = pages.filter((page) => page.url !== url);
    setPages(updatedPages);
    await LocalStorage.setItem("pages", JSON.stringify(updatedPages));
    showToast({
      style: Toast.Style.Success,
      title: "Page deleted successfully!",
    });
  }

  async function deleteAllReadPages() {
    const updatedPages = pages.filter((page) => !page.isRead);
    setPages(updatedPages);
    await LocalStorage.setItem("pages", JSON.stringify(updatedPages));
    showToast({
      style: Toast.Style.Success,
      title: "All read pages deleted successfully!",
    });
  }

  const filteredPages = pages
    .filter((page) => (status === "read" ? page.isRead : status === "unread" ? !page.isRead : true))
    .filter((page) => selectedTagId === "all" || page.tagIds.includes(selectedTagId))
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return sortOrder === "oldest" ? dateA - dateB : dateB - dateA;
    });

  if (isCreatingTag) {
    return (
      <TagForm
        onSubmit={async (values) => {
          const success = await createTag({ name: values.name, color: values.color });
          if (success) {
            setIsCreatingTag(false);
          }
        }}
        onCancel={() => setIsCreatingTag(false)}
        submitTitle="Create Tag"
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="List Pages"
      searchBarPlaceholder="Search pages..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Pages" value={filter} onChange={setFilter}>
          <List.Dropdown.Section title="Read Status">
            <List.Dropdown.Item value="status:all" title="📚 All Pages" />
            <List.Dropdown.Item value="status:unread" title="📖 Unread" />
            <List.Dropdown.Item value="status:read" title="✅ Read" />
          </List.Dropdown.Section>
          {tags.length > 0 && (
            <List.Dropdown.Section title="Tags">
              {tags.map((tag) => (
                <List.Dropdown.Item
                  key={tag.id}
                  value={`tag:${tag.id}`}
                  title={`${tag.name}`}
                  icon={{ source: Icon.CircleFilled, tintColor: tag.color }}
                />
              ))}
            </List.Dropdown.Section>
          )}
          <List.Dropdown.Section title="Sort Order">
            <List.Dropdown.Item value="sort:newest" title="⬇️ Newest First" />
            <List.Dropdown.Item value="sort:oldest" title="⬆️ Oldest First" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredPages.map((page) => (
        <List.Item
          key={page.url}
          title={page.title}
          subtitle={page.url}
          icon={page.faviconUrl ? { source: page.faviconUrl } : page.isRead ? Icon.Checkmark : Icon.Circle}
          accessories={[
            ...(page.isRead
              ? [
                  {
                    icon: Icon.Checkmark,
                    tooltip: "Read",
                  },
                ]
              : []),
            ...page.tagIds
              .map((tagId) => {
                const tag = tags.find((t) => t.id === tagId);
                return tag
                  ? {
                      tag: { value: tag.name, color: tag.color },
                    }
                  : undefined;
              })
              .filter((accessory): accessory is { tag: { value: string; color: string } } => accessory !== undefined),
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={page.url} onOpen={() => markPageAsRead(page.url)} />
              <ActionPanel.Submenu title="Edit Tags" icon={Icon.Tag} shortcut={{ modifiers: ["cmd"], key: "t" }}>
                {tags.map((tag) => (
                  <Action
                    key={tag.id}
                    title={`${tag.name} ${page.tagIds.includes(tag.id) ? "✓" : ""}`}
                    icon={{ source: Icon.CircleFilled, tintColor: tag.color }}
                    onAction={() => {
                      const isTagged = page.tagIds.includes(tag.id);
                      const newTagIds = isTagged ? page.tagIds.filter((id) => id !== tag.id) : [...page.tagIds, tag.id];
                      handleUpdatePageTags(page.url, newTagIds);
                    }}
                  />
                ))}
              </ActionPanel.Submenu>
              {page.isRead && (
                <Action
                  icon={Icon.Circle}
                  title="Mark as Unread"
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                  onAction={() => markPageAsUnread(page.url)}
                />
              )}
              <Action
                icon={Icon.Plus}
                title="Create New Tag"
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                onAction={() => setIsCreatingTag(true)}
              />
              <Action
                icon={Icon.Trash}
                title="Delete"
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => deletePage(page.url)}
              />
              {pages.some((p) => p.isRead) && (
                <Action
                  icon={Icon.Trash}
                  title="Delete All Read Pages"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                  onAction={deleteAllReadPages}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
