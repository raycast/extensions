import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Form,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { getFavicon, useForm } from "@raycast/utils";
import { useState, useCallback } from "react";
import { updateLinks, deleteLink, createLink, updateLinkDetails, normalizeUrl } from "./api";
import { Link } from "./types";
import { useLinks } from "./use-links";

type ReadFilter = "all" | "unread" | "read";
type EditLinkValues = { title: string; summary: string };

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

function EditLinkForm(props: { link: Link; onSave: (values: EditLinkValues) => Promise<void> }) {
  const { link, onSave } = props;
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<EditLinkValues>({
    initialValues: {
      title: link.title ?? "",
      summary: link.summary ?? "",
    },
    validation: {
      title: (value) => {
        const trimmed = (value ?? "").trim();
        if (!trimmed) return "Title is required";
        if (trimmed.length > 500) return "Title must be 500 characters or less";
      },
      summary: (value) => {
        if ((value ?? "").trim().length > 2000) return "Summary must be 2000 characters or less";
      },
    },
    onSubmit: async (values) => {
      await onSave(values);
      pop();
    },
  });

  return (
    <Form
      navigationTitle="Edit Link"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Link title" {...itemProps.title} />
      <Form.TextArea title="Summary" placeholder="Add a summary (optional)" {...itemProps.summary} />
    </Form>
  );
}

export default function SearchLinks() {
  const [filter, setFilter] = useState<ReadFilter>("all");
  const [showDetail, setShowDetail] = useState(true);
  const [searchText, setSearchText] = useState("");

  const { links, total, isLoading, error, pagination, revalidate, mutateLink } = useLinks(filter, searchText);

  const handleToggleRead = useCallback(
    async (link: Link) => {
      let markRead = false;
      try {
        const changed = await mutateLink(link.id, async (current) => {
          markRead = !current.read_at;
          await updateLinks([current.id], markRead);
          return { read_at: markRead ? new Date().toISOString() : null };
        });
        if (changed) await showToast(Toast.Style.Success, markRead ? "Marked as read" : "Moved to inbox");
      } catch (error) {
        await showToast(Toast.Style.Failure, "Failed to update", (error as Error).message);
      }
    },
    [mutateLink],
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
        try {
          const changed = await mutateLink(link.id, async (current) => {
            await deleteLink(current.id);
            return null;
          });
          if (changed) await showToast(Toast.Style.Success, "Link deleted");
        } catch (error) {
          await showToast(Toast.Style.Failure, "Failed to delete", (error as Error).message);
        }
      }
    },
    [mutateLink],
  );

  const handleSaveFromClipboard = useCallback(async () => {
    const clipboard = await Clipboard.readText();
    const trimmed = clipboard?.trim();
    if (!trimmed) {
      await showToast(Toast.Style.Failure, "No URL in clipboard");
      return;
    }
    try {
      const normalized = normalizeUrl(trimmed);
      const result = await createLink(normalized);
      await showToast(Toast.Style.Success, result.duplicate ? "Already saved" : "Link saved", normalized);
      revalidate();
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to save", (error as Error).message);
    }
  }, [revalidate]);

  const handleEditDetails = useCallback(
    async (link: Link, values: EditLinkValues) => {
      const title = values.title.trim();
      const normalizedSummary = values.summary.trim();
      const summary = normalizedSummary ? normalizedSummary : null;

      try {
        const changed = await mutateLink(link.id, async (current) => {
          const result = await updateLinkDetails(current.id, title, summary);
          return {
            title: result.link?.title ?? title,
            summary: result.link ? result.link.summary : summary,
            updated_at: result.link?.updated_at ?? new Date().toISOString(),
          };
        });
        if (changed) await showToast(Toast.Style.Success, "Link updated");
      } catch (error) {
        await showToast(Toast.Style.Failure, "Failed to update", (error as Error).message);
        throw error;
      }
    },
    [mutateLink],
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={links.length ? `Shiori · ${links.length} of ${total}` : "Shiori"}
      actions={
        <ActionPanel>
          <Action title="Refresh Links" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action title="Save Link from Clipboard" icon={Icon.Plus} onAction={handleSaveFromClipboard} />
        </ActionPanel>
      }
      isShowingDetail={showDetail}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search links..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={(val) => setFilter(val as ReadFilter)}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Unread" value="unread" />
          <List.Dropdown.Item title="Read" value="read" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={isLoading ? "Loading Links" : error ? "Could Not Load Links" : "No Links"}
        description={
          error
            ? error.message
            : searchText
              ? "No links match this search and filter"
              : filter === "all"
                ? "Save your first link"
                : `No ${filter} links`
        }
      />
      {error && links.length > 0 && (
        <List.Item
          title="Could Not Load More Links"
          subtitle={error.message}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Refresh Links" onAction={revalidate} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      )}
      {links.map((link: Link) => (
        <List.Item
          key={link.id}
          id={link.id}
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
                  {link.author ? <List.Item.Detail.Metadata.Label title="Author" text={link.author} /> : null}
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
                <Action.Push
                  title="Edit Title & Summary"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<EditLinkForm link={link} onSave={(values) => handleEditDetails(link, values)} />}
                />
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
                <Action title="Refresh Links" icon={Icon.ArrowClockwise} onAction={revalidate} />
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
