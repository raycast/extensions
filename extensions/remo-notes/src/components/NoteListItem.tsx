import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import type { MutatePromise } from "@raycast/utils";
import { EditNoteForm } from "./EditNoteForm";
import { buildAppUrl } from "../config";
import type { Folder, Note } from "../types";
import { remoApi } from "../utils/api";
import { handleError } from "../utils/errors";
import { sortByPinned } from "../utils/notes";
import { stripHtml } from "../utils/stripHtml";
import { toMarkdown } from "../utils/toMarkdown";

interface NoteListItemProps {
  note: Note;
  onRefresh: () => void;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  mutate?: MutatePromise<Note[] | undefined>;
  folders?: Folder[];
}

export function NoteListItem({ note, onRefresh, isShowingDetail, onToggleDetail, mutate, folders }: NoteListItemProps) {
  const webUrl = buildAppUrl(`/notes/${note._id}`);
  const canEdit = !note.isLocked && !note.isE2E && !note.deletedAt;

  const handleTogglePin = async () => {
    try {
      if (mutate) {
        await mutate(remoApi.togglePin(note._id), {
          optimisticUpdate: (data) =>
            sortByPinned((data ?? []).map((n) => (n._id === note._id ? { ...n, isPinned: !n.isPinned } : n))),
        });
      } else {
        await remoApi.togglePin(note._id);
        onRefresh();
      }
    } catch (error) {
      handleError(error, note.isPinned ? "Failed to unpin note" : "Failed to pin note");
    }
  };

  const handleMove = async (folderId: string | null) => {
    try {
      if (mutate) {
        await mutate(remoApi.updateNote(note._id, { folderId }));
      } else {
        await remoApi.updateNote(note._id, { folderId });
        onRefresh();
      }
      showToast({ style: Toast.Style.Success, title: "Note moved" });
    } catch (error) {
      handleError(error, "Failed to move note");
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: "Delete to Trash",
      message: `Move "${note.title || "Untitled"}" to trash?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      if (mutate) {
        await mutate(remoApi.softDeleteNote(note._id), {
          optimisticUpdate: (data) => (data ?? []).filter((n) => n._id !== note._id),
        });
      } else {
        await remoApi.softDeleteNote(note._id);
        onRefresh();
      }
      showToast({ style: Toast.Style.Success, title: "Moved to trash" });
    } catch (error) {
      handleError(error, "Failed to delete note");
    }
  };

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
          {canEdit && (
            <Action.Push
              title="Edit Note"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<EditNoteForm note={note} folders={folders ?? []} onSaved={onRefresh} />}
            />
          )}
          {canEdit && folders && folders.length > 0 && (
            <ActionPanel.Submenu
              title="Move to Folder"
              icon={Icon.Folder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            >
              <Action title="No Folder (Inbox)" icon={Icon.Tray} onAction={() => handleMove(null)} />
              {folders.map((folder) => (
                <Action
                  key={folder._id}
                  title={folder.name}
                  icon={Icon.Folder}
                  onAction={() => handleMove(folder._id)}
                />
              ))}
            </ActionPanel.Submenu>
          )}
          <Action
            title={note.isPinned ? "Unpin Note" : "Pin Note"}
            icon={note.isPinned ? Icon.PinDisabled : Icon.Pin}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={handleTogglePin}
          />
          {canEdit && (
            <Action
              title="Delete to Trash"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={handleDelete}
            />
          )}
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
