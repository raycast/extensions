import { Action, ActionPanel, Alert, Clipboard, Color, Icon, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { useState, useCallback } from "react";
import { fetchLinks, updateLinks, deleteLink, createLink } from "./api";
import { Link } from "./types";

type ReadFilter = "all" | "unread" | "read";

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function linkDetail(link: Link): string {
  const parts: string[] = [];

  if (link.image_url) {
    parts.push(`![](${link.image_url})`);
  }

  if (link.summary) {
    parts.push(link.summary);
  }

  return parts.join("\n\n") || `[${link.url}](${link.url})`;
}

export default function SearchLinks() {
  const [filter, setFilter] = useState<ReadFilter>("all");
  const [showDetail, setShowDetail] = useState(true);

  const { data, isLoading, revalidate, mutate } = useCachedPromise(
    (readFilter: ReadFilter) => fetchLinks({ limit: 100, read: readFilter, sort: "newest" }),
    [filter],
    { keepPreviousData: true },
  );

  const links = data?.links ?? [];

  const handleToggleRead = useCallback(
    async (link: Link) => {
      const markRead = !link.read_at;
      const optimistic = {
        ...data!,
        links: data!.links.map((l) =>
          l.id === link.id ? { ...l, read_at: markRead ? new Date().toISOString() : null } : l,
        ),
      };
      try {
        await mutate(
          updateLinks([link.id], markRead).then(() => optimistic),
          {
            optimisticUpdate: () => optimistic,
          },
        );
        await showToast(Toast.Style.Success, markRead ? "Marked as read" : "Moved to inbox");
      } catch (error) {
        await showToast(Toast.Style.Failure, "Failed to update", (error as Error).message);
      }
    },
    [data, mutate],
  );

  const handleDelete = useCallback(
    async (link: Link) => {
      if (
        await confirmAlert({
          title: "Delete Link",
          message: `Delete "${link.title || link.url}"?`,
          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
        })
      ) {
        const optimistic = {
          ...data!,
          links: data!.links.filter((l) => l.id !== link.id),
          total: data!.total - 1,
        };
        try {
          await mutate(
            deleteLink(link.id).then(() => optimistic),
            {
              optimisticUpdate: () => optimistic,
            },
          );
          await showToast(Toast.Style.Success, "Link deleted");
        } catch (error) {
          await showToast(Toast.Style.Failure, "Failed to delete", (error as Error).message);
        }
      }
    },
    [data, mutate],
  );

  const handleSaveFromClipboard = useCallback(async () => {
    const clipboard = await Clipboard.readText();
    const trimmed = clipboard?.trim();
    if (!trimmed) {
      await showToast(Toast.Style.Failure, "No URL in clipboard");
      return;
    }
    try {
      const normalized = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      const result = await createLink(normalized);
      await showToast(Toast.Style.Success, result.duplicate ? "Already saved" : "Link saved", normalized);
      revalidate();
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to save", (error as Error).message);
    }
  }, [revalidate]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Filter links..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={(val) => setFilter(val as ReadFilter)}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Unread" value="unread" />
          <List.Dropdown.Item title="Read" value="read" />
        </List.Dropdown>
      }
    >
      <List.EmptyView title="No Links" description={filter === "all" ? "Save your first link" : `No ${filter} links`} />
      {links.map((link: Link) => (
        <List.Item
          key={link.id}
          icon={getFavicon(link.url, { fallback: Icon.Link })}
          title={link.title || link.url}
          subtitle={showDetail ? undefined : link.domain}
          accessories={
            showDetail
              ? undefined
              : [
                  ...(!link.read_at ? [{ tag: { value: "Unread", color: Color.Blue } }] : []),
                  { text: timeAgo(link.created_at) },
                ]
          }
          detail={
            <List.Item.Detail
              markdown={linkDetail(link)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Link title="Domain" text={link.domain} target={link.url} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Saved" text={timeAgo(link.created_at)} />
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={link.read_at ? "Read" : "Unread"}
                    icon={
                      link.read_at
                        ? { source: Icon.CheckCircle, tintColor: Color.Green }
                        : { source: Icon.Circle, tintColor: Color.Blue }
                    }
                  />
                  {link.source ? <List.Item.Detail.Metadata.Label title="Source" text={link.source} /> : null}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open in Browser" url={link.url} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={link.url}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                {link.summary && (
                  <Action.CopyToClipboard
                    title="Copy Summary"
                    content={link.summary}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                )}
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action
                  title={link.read_at ? "Move to Inbox" : "Mark as Read"}
                  icon={link.read_at ? Icon.Envelope : Icon.CheckCircle}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => handleToggleRead(link)}
                />
                <Action
                  title={showDetail ? "Hide Detail" : "Show Detail"}
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => setShowDetail((v) => !v)}
                />
                <Action
                  title="Save Link from Clipboard"
                  icon={Icon.Plus}
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
                  onAction={() => handleDelete(link)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
