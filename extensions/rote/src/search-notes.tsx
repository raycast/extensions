import {
  Action,
  ActionPanel,
  List,
  Icon,
  Color,
  getPreferenceValues,
} from "@raycast/api";
import type { Preferences } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { getApiClient } from "./api";
import { Note } from "./types";

// Search notes with detail panel

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
    case "protected":
      return { icon: Icon.Lock, tintColor: Color.Orange };
    default:
      return { icon: Icon.LockDisabled, tintColor: Color.SecondaryText };
  }
}

function getStateText(state: string): string {
  switch (state) {
    case "public":
      return "Public";
    case "protected":
      return "Protected";
    default:
      return "Private";
  }
}

function truncateContent(content: string, maxLength: number = 80): string {
  const firstLine = content.split("\n")[0];
  if (firstLine.length <= maxLength) return firstLine;
  return firstLine.substring(0, maxLength).trim() + "...";
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

export default function SearchNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const preferences = getPreferenceValues<Preferences>();
  const webUrl =
    (preferences.webUrl as unknown as string | undefined)?.replace(/\/$/, "") ||
    "";
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!searchText.trim()) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceTimer.current = setTimeout(async () => {
      try {
        const api = getApiClient();
        const notesList = await api.searchNotes({
          keyword: searchText.trim(),
          limit: 50,
        });
        setNotes(notesList || []);
      } catch (error) {
        console.error("Search failed:", error);
        setNotes([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && notes.length > 0}
      searchBarPlaceholder="Search notes..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {searchText.trim() === "" ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Your Notes"
          description="Start typing to search"
        />
      ) : notes.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No Results"
          description={`No notes found for "${searchText}"`}
        />
      ) : (
        notes.map((note) => {
          const stateInfo = getStateIcon(note.state);
          return (
            <List.Item
              key={note.id}
              title={truncateContent(note.content)}
              subtitle={isShowingDetail ? undefined : note.tags?.join(", ")}
              accessories={
                isShowingDetail
                  ? undefined
                  : [
                      { icon: stateInfo.icon, tooltip: note.state },
                      { text: formatDate(note.createdAt) },
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
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
