import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { buildAppUrl } from "./config";
import type { Note } from "./types";
import { remoApi } from "./utils/api";
import { handleError } from "./utils/errors";
import { stripHtml } from "./utils/stripHtml";
import { toMarkdown } from "./utils/toMarkdown";

export default function Trash() {
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const fetchTrash = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await remoApi.listNotes({
        includeDeleted: true,
      });
      const deletedNotes = result.filter((n: Note) => n.deletedAt !== undefined);
      setNotes(deletedNotes.sort((a: Note, b: Note) => (b.deletedAt ?? b.updatedAt) - (a.deletedAt ?? a.updatedAt)));
    } catch (error) {
      handleError(error, "Failed to fetch trash");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  async function handleRestore(noteId: Note["_id"]) {
    try {
      await remoApi.restoreNote(noteId);
      showToast({ style: Toast.Style.Success, title: "Note restored" });
      fetchTrash();
    } catch (error) {
      handleError(error, "Failed to restore note");
    }
  }

  async function handlePermanentDelete(noteId: Note["_id"]) {
    if (
      await confirmAlert({
        title: "Permanently Delete Note",
        message: "Are you sure you want to permanently delete this note? This action cannot be undone.",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await remoApi.permanentDelete(noteId);

        showToast({
          style: Toast.Style.Success,
          title: "Note permanently deleted",
        });
        fetchTrash();
      } catch (error) {
        handleError(error, "Failed to permanently delete note");
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search deleted notes..." isShowingDetail={isShowingDetail}>
      {notes.length === 0 && !isLoading ? (
        <List.EmptyView title="Trash is empty" icon={{ source: Icon.Trash, tintColor: Color.Green }} />
      ) : (
        notes.map((note) => (
          <List.Item
            key={note._id}
            title={note.title || "Untitled"}
            subtitle={isShowingDetail ? undefined : stripHtml(note.content || "").substring(0, 50)}
            icon={{ source: Icon.Trash, tintColor: Color.Red }}
            accessories={
              isShowingDetail
                ? []
                : [
                    {
                      text: `Deleted: ${new Date(note.deletedAt ?? note.updatedAt).toLocaleDateString("en-US")}`,
                      tooltip: "Date deleted",
                    },
                  ]
            }
            detail={
              <List.Item.Detail
                markdown={toMarkdown(note.content || "") || "_No content_"}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Title" text={note.title || "Untitled"} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Deleted At"
                      text={new Date(note.deletedAt ?? note.updatedAt).toLocaleString("en-US")}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={isShowingDetail ? "Hide Details" : "Show Details"}
                  icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
                  onAction={() => setIsShowingDetail((prev) => !prev)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                <Action.OpenInBrowser title="Open in Web App" url={buildAppUrl(`/notes/${note._id}`)} />
                <Action title="Restore Note" icon={Icon.RotateAntiClockwise} onAction={() => handleRestore(note._id)} />
                <Action
                  title="Delete Permanently"
                  icon={Icon.Xmark}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handlePermanentDelete(note._id)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
