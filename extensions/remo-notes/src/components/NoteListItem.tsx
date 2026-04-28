import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { buildAppUrl } from "../config";
import type { Note } from "../types";
import { remoApi } from "../utils/api";
import { handleError } from "../utils/errors";
import { stripHtml } from "../utils/stripHtml";
import { toMarkdown } from "../utils/toMarkdown";

interface NoteListItemProps {
  note: Note;
  onRefresh: () => void;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
}

export function NoteListItem({ note, onRefresh, isShowingDetail, onToggleDetail }: NoteListItemProps) {
  const webUrl = buildAppUrl(`/notes/${note._id}`);

  return (
    <List.Item
      title={note.title || "Untitled"}
      subtitle={
        isShowingDetail
          ? undefined
          : note.isLocked
            ? "🔒 Locked Note"
            : note.isE2E
              ? "🛡️ Encrypted Note"
              : (note.summary || stripHtml(note.content || "")).substring(0, 50)
      }
      accessories={
        isShowingDetail
          ? []
          : [
              { text: new Date(note.updatedAt).toLocaleDateString("en-US") },
              note.isPinned ? { icon: Icon.Pin } : {},
              note.isLocked ? { icon: Icon.Lock } : {},
            ]
      }
      detail={
        <List.Item.Detail
          markdown={
            note.isLocked
              ? "### 🔒 This note is locked\nUnlock it in the web app to view the content."
              : note.isE2E
                ? "### 🛡️ This note is encrypted\nUnlock it in the web app to view the content."
                : toMarkdown(note.content || "") || "_No content_"
          }
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Title" text={note.title || "Untitled"} />
              {note.tags && note.tags.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {note.tags.map((tag) => (
                    <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Last Updated"
                text={new Date(note.updatedAt).toLocaleString("en-US")}
              />
              <List.Item.Detail.Metadata.Label title="Source" text={note.source === "raycast" ? "Raycast" : "Web"} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
            onAction={onToggleDetail}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <Action.OpenInBrowser url={webUrl} title="Open in Web App" />
          <Action
            title={note.isPinned ? "Unpin Note" : "Pin Note"}
            icon={note.isPinned ? Icon.PinDisabled : Icon.Pin}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={async () => {
              try {
                await remoApi.togglePin(note._id);
                onRefresh();
              } catch (error) {
                handleError(error, note.isPinned ? "Failed to unpin note" : "Failed to pin note");
              }
            }}
          />
          {note.isLocked || note.isE2E || !note.content ? null : (
            <Action.CopyToClipboard
              content={toMarkdown(note.content)}
              title="Copy Content"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}

          <Action.CopyToClipboard
            content={webUrl}
            title="Copy Link"
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          />
        </ActionPanel>
      }
    />
  );
}
