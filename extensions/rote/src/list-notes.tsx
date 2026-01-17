import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  getPreferenceValues,
  confirmAlert,
  Alert,
} from "@raycast/api";
import type { Preferences } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { getApiClient } from "./api";
import { Note } from "./types";
import EditNote from "./edit-note";

// List notes with filters and detail panel

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 1) {
      const minutes = Math.floor(diff / (60 * 1000));
      return minutes < 1 ? "Just now" : `${minutes}m ago`;
    }
    return `${hours}h ago`;
  }

  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStateIcon(state: string): { icon: Icon; tintColor: Color } {
  switch (state) {
    case "public":
      return { icon: Icon.Globe, tintColor: Color.Green };
    default:
      return { icon: Icon.LockDisabled, tintColor: Color.SecondaryText };
  }
}

function getStateText(state: string): string {
  switch (state) {
    case "public":
      return "Public";
    default:
      return "Private";
  }
}

function truncateContent(content: string, maxLength: number = 80): string {
  const firstLine = content.split("\n")[0];
  if (firstLine.length <= maxLength) return firstLine;
  return firstLine.substring(0, maxLength).trim() + "...";
}

function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isYesterday(dateString: string): boolean {
  const date = new Date(dateString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

function isWithinDays(dateString: string, days: number): boolean {
  const date = new Date(dateString);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return date >= cutoff;
}

// Generate markdown for detail panel
function generateDetailMarkdown(note: Note): string {
  let markdown = "";

  // Content first
  markdown += note.content;

  // Then show attachments/images
  if (note.attachments && note.attachments.length > 0) {
    const images = note.attachments.filter((a) =>
      a.details?.mimetype?.startsWith("image/"),
    );
    if (images.length > 0) {
      for (const attachment of images) {
        const imageUrl = attachment.compressUrl || attachment.url;
        if (imageUrl) {
          markdown += `![](${imageUrl})\n\n`;
        }
      }
    }
  }

  return markdown;
}

// Detail metadata component
function NoteDetailMetadata({ note }: { note: Note }) {
  const stateInfo = getStateIcon(note.state);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Status"
        text={getStateText(note.state)}
        icon={{ source: stateInfo.icon, tintColor: stateInfo.tintColor }}
      />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Created"
        text={formatFullDate(note.createdAt)}
      />
      <List.Item.Detail.Metadata.Label
        title="Updated"
        text={formatFullDate(note.updatedAt)}
      />
      {note.tags && note.tags.length > 0 && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Tags">
            {note.tags.map((tag, index) => (
              <List.Item.Detail.Metadata.TagList.Item
                key={index}
                text={tag}
                color={Color.Blue}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </>
      )}
      {note.attachments && note.attachments.length > 0 && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Attachments"
            text={`${note.attachments.length} file(s)`}
            icon={Icon.Paperclip}
          />
        </>
      )}
      {note.pin && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Pinned"
            icon={{ source: Icon.Pin, tintColor: Color.Yellow }}
          />
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}

type FilterType =
  | "all"
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "public"
  | "private"
  | "pinned"
  | string;

export default function ListNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const preferences = getPreferenceValues<Preferences>();
  const webUrl =
    (preferences.webUrl as unknown as string | undefined)?.replace(/\/$/, "") ||
    "";

  // Extract unique tags from notes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((note) => {
      note.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Filter notes based on selection
  const filteredNotes = useMemo(() => {
    let filtered = notes;

    if (filter === "today")
      filtered = notes.filter((n) => isToday(n.createdAt));
    else if (filter === "yesterday")
      filtered = notes.filter((n) => isYesterday(n.createdAt));
    else if (filter === "week")
      filtered = notes.filter((n) => isWithinDays(n.createdAt, 7));
    else if (filter === "month")
      filtered = notes.filter((n) => isWithinDays(n.createdAt, 30));
    else if (filter === "public")
      filtered = notes.filter((n) => n.state === "public");
    else if (filter === "private")
      filtered = notes.filter((n) => n.state === "private");
    else if (filter === "pinned") filtered = notes.filter((n) => n.pin);
    else if (filter.startsWith("tag:")) {
      const tag = filter.slice(4);
      filtered = notes.filter((n) => n.tags?.includes(tag));
    }

    // Sort: pinned notes first, then by creation date
    return filtered.sort((a, b) => {
      // Pinned notes always come first
      if (a.pin && !b.pin) return -1;
      if (!a.pin && b.pin) return 1;

      // If both pinned or both not pinned, sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notes, filter]);

  async function fetchNotes() {
    setIsLoading(true);

    const api = getApiClient();

    if (!api.isConfigured()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not configured",
        message: "Please configure username and password",
      });
      setIsLoading(false);
      return;
    }

    try {
      const notesList = await api.getNotes({ limit: 100 });
      setNotes(notesList || []);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchNotes();
  }, []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Filter notes..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" storeValue onChange={setFilter}>
          <List.Dropdown.Section title="Time">
            <List.Dropdown.Item
              title="All Notes"
              value="all"
              icon={Icon.List}
            />
            <List.Dropdown.Item
              title="Today"
              value="today"
              icon={Icon.Calendar}
            />
            <List.Dropdown.Item
              title="Yesterday"
              value="yesterday"
              icon={Icon.Calendar}
            />
            <List.Dropdown.Item
              title="Last 7 Days"
              value="week"
              icon={Icon.Calendar}
            />
            <List.Dropdown.Item
              title="Last 30 Days"
              value="month"
              icon={Icon.Calendar}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item
              title="Public"
              value="public"
              icon={Icon.Globe}
            />
            <List.Dropdown.Item
              title="Private"
              value="private"
              icon={Icon.LockDisabled}
            />
            <List.Dropdown.Item title="Pinned" value="pinned" icon={Icon.Pin} />
          </List.Dropdown.Section>
          {allTags.length > 0 && (
            <List.Dropdown.Section title="Tags">
              {allTags.map((tag) => (
                <List.Dropdown.Item
                  key={tag}
                  title={`#${tag}`}
                  value={`tag:${tag}`}
                  icon={Icon.Tag}
                />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {filteredNotes.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No notes found"
          description={
            filter === "all"
              ? "Create your first note"
              : "No notes match this filter"
          }
        />
      ) : (
        filteredNotes.map((note) => {
          const stateInfo = getStateIcon(note.state);
          const displayTitle = note.pin
            ? `📌 ${truncateContent(note.content)}`
            : truncateContent(note.content);
          return (
            <List.Item
              key={note.id}
              title={displayTitle}
              subtitle={isShowingDetail ? undefined : note.tags?.join(", ")}
              accessories={
                isShowingDetail
                  ? undefined
                  : [
                      { icon: stateInfo.icon, tooltip: note.state },
                      { text: formatDate(note.createdAt) },
                      ...(note.pin
                        ? [{ icon: Icon.Pin, tooltip: "Pinned" }]
                        : []),
                    ]
              }
              detail={
                <List.Item.Detail
                  markdown={generateDetailMarkdown(note)}
                  metadata={<NoteDetailMetadata note={note} />}
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title={isShowingDetail ? "Hide Detail" : "Show Detail"}
                      icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
                      onAction={() => setIsShowingDetail(!isShowingDetail)}
                    />
                    {webUrl && (
                      <Action.OpenInBrowser
                        title="Open in Browser"
                        url={`${webUrl}/rote/${note.id}`}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Edit">
                    <Action.Push
                      title="Edit Note"
                      icon={Icon.Pencil}
                      target={
                        <EditNote note={note} onNoteUpdated={fetchNotes} />
                      }
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                    <Action
                      title={note.pin ? "Unpin Note" : "Pin Note"}
                      icon={note.pin ? Icon.PinDisabled : Icon.Pin}
                      onAction={async () => {
                        try {
                          const api = getApiClient();
                          await api.togglePin(note.id, !note.pin);
                          await showToast({
                            style: Toast.Style.Success,
                            title: note.pin ? "Note unpinned" : "Note pinned",
                          });
                          await fetchNotes();
                        } catch (error) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to toggle pin",
                            message:
                              error instanceof Error
                                ? error.message
                                : "Unknown error",
                          });
                        }
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "p" }}
                    />
                    <Action
                      title={note.archived ? "Unarchive Note" : "Archive Note"}
                      icon={note.archived ? Icon.Tray : Icon.Box}
                      onAction={async () => {
                        try {
                          const api = getApiClient();
                          await api.toggleArchive(note.id, !note.archived);
                          await showToast({
                            style: Toast.Style.Success,
                            title: note.archived
                              ? "Note unarchived"
                              : "Note archived",
                          });
                          await fetchNotes();
                        } catch (error) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to toggle archive",
                            message:
                              error instanceof Error
                                ? error.message
                                : "Unknown error",
                          });
                        }
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "a" }}
                    />
                    <Action
                      title="Delete Note"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        const confirmed = await confirmAlert({
                          title: "Delete Note",
                          message:
                            "Are you sure you want to delete this note? This action cannot be undone.",
                          primaryAction: {
                            title: "Delete",
                            style: Alert.ActionStyle.Destructive,
                          },
                        });

                        if (confirmed) {
                          try {
                            const api = getApiClient();
                            await api.deleteNote(note.id);
                            await showToast({
                              style: Toast.Style.Success,
                              title: "Note deleted",
                            });
                            await fetchNotes();
                          } catch (error) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: "Failed to delete note",
                              message:
                                error instanceof Error
                                  ? error.message
                                  : "Unknown error",
                            });
                          }
                        }
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy Content"
                      content={note.content}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.Paste
                      title="Paste Content"
                      content={note.content}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                    />
                    {webUrl && (
                      <Action.CopyToClipboard
                        title="Copy Link"
                        content={`${webUrl}/note/${note.id}`}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={fetchNotes}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
