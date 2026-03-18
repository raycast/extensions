import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  buildItemMarkdown,
  deleteItem,
  fetchLinks,
  formatRelativeTime,
  getItemHost,
  saveLink,
  updateItem,
} from "./api";
import type { KeepItem, LinkFilter } from "./types";

export default function SearchLinks() {
  const [filter, setFilter] = useState<LinkFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [showDetail, setShowDetail] = useState(true);

  const { data, isLoading, revalidate } = useCachedPromise(
    (nextFilter: LinkFilter, nextSearch: string) =>
      fetchLinks({
        filter: nextFilter,
        search: nextSearch,
      }),
    [filter, searchText],
    { keepPreviousData: true },
  );

  const links = data?.items ?? [];

  const handleToggleRead = async (item: KeepItem) => {
    const nextProcessed = !item.processedAt;
    const toast = await showToast(
      Toast.Style.Animated,
      nextProcessed ? "Marking as read..." : "Moving back to unread...",
    );

    try {
      await updateItem(item.id, { processed: nextProcessed });
      toast.style = Toast.Style.Success;
      toast.title = nextProcessed ? "Marked as read" : "Marked as unread";
      await revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update";
      toast.message = String((error as Error).message || error);
    }
  };

  const handleDelete = async (item: KeepItem) => {
    const confirmed = await confirmAlert({
      title: "Delete Link",
      message: `Delete "${item.title || item.url}" from Keep?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    const toast = await showToast(Toast.Style.Animated, "Deleting link...");

    try {
      await deleteItem(item.id);
      toast.style = Toast.Style.Success;
      toast.title = "Link deleted";
      await revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete";
      toast.message = String((error as Error).message || error);
    }
  };

  const handleSaveFromClipboard = async () => {
    const clipboard = (await Clipboard.readText())?.trim();
    if (!clipboard) {
      await showToast(Toast.Style.Failure, "Clipboard is empty");
      return;
    }

    const toast = await showToast(Toast.Style.Animated, "Saving link...");

    try {
      const result = await saveLink({
        url: clipboard,
        source: "raycast:clipboard",
      });
      toast.style = Toast.Style.Success;
      toast.title = result.added ? "Link saved" : "Link updated";
      toast.message = result.normalizedUrl;
      await revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to save";
      toast.message = String((error as Error).message || error);
    }
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Keep links..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          value={filter}
          onChange={(value) => setFilter(value as LinkFilter)}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Unread" value="unread" />
          <List.Dropdown.Item title="Read" value="read" />
        </List.Dropdown>
      }
      throttle
    >
      <List.EmptyView
        title="No Links"
        description={
          filter === "all"
            ? "Save your first link to Keep"
            : filter === "unread"
              ? "No unread links found"
              : "No read links found"
        }
        actions={
          <ActionPanel>
            <Action
              title="Save Link from Clipboard"
              icon={Icon.Clipboard}
              onAction={handleSaveFromClipboard}
            />
          </ActionPanel>
        }
      />

      {links.map((item) => {
        const host = getItemHost(item);
        const statusText = item.processedAt ? "Read" : "Unread";
        return (
          <List.Item
            key={item.id}
            icon={getFavicon(item.url, { fallback: Icon.Link })}
            title={item.title || item.url}
            subtitle={showDetail ? undefined : host}
            accessories={
              showDetail
                ? undefined
                : [
                    {
                      tag: {
                        value: statusText,
                        color: item.processedAt ? Color.Green : Color.Blue,
                      },
                    },
                    { text: formatRelativeTime(item.createdAt) },
                  ]
            }
            detail={
              <List.Item.Detail
                markdown={buildItemMarkdown(item)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Link
                      title="URL"
                      text={host}
                      target={item.url}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Saved"
                      text={formatRelativeTime(item.createdAt)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Status"
                      text={statusText}
                    />
                    {item.collectionName ? (
                      <List.Item.Detail.Metadata.Label
                        title="Collection"
                        text={item.collectionName}
                      />
                    ) : null}
                    {item.tags?.length ? (
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {item.tags.map((tag) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={tag}
                            text={tag}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : null}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser url={item.url} />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={item.url}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  {item.contentMarkdown?.trim() ? (
                    <Action.CopyToClipboard
                      title="Copy Markdown"
                      content={item.contentMarkdown}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  ) : null}
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    title={item.processedAt ? "Mark as Unread" : "Mark as Read"}
                    icon={item.processedAt ? Icon.Circle : Icon.CheckCircle}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => handleToggleRead(item)}
                  />
                  <Action
                    title={showDetail ? "Hide Detail" : "Show Detail"}
                    icon={Icon.Sidebar}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    onAction={() => setShowDetail((current) => !current)}
                  />
                  <Action
                    title="Save Link from Clipboard"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={handleSaveFromClipboard}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    title="Delete Link"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDelete(item)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
