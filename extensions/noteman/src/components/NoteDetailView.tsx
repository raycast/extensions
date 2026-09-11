import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Detail,
  Icon,
  Toast,
  confirmAlert,
  showInFinder,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { moveToTrash } from "../lib/fs";
import { NoteFile, duplicateNoteFile, getNoteByPath } from "../lib/notes";
import { AppendTextForm, NoteEditForm } from "./NoteEditorForm";

type NoteDetailViewProps = {
  notePath: string;
  onNoteChanged?: (path: string) => void;
  onNoteDeleted?: (path: string) => void;
};

function formatModifiedDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function NoteDetailView({
  notePath,
  onNoteChanged,
  onNoteDeleted,
}: NoteDetailViewProps) {
  const [currentPath, setCurrentPath] = useState(notePath);
  const [note, setNote] = useState<NoteFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { push, pop } = useNavigation();

  useEffect(() => {
    setCurrentPath(notePath);
  }, [notePath]);

  const refreshNote = useCallback(
    async (pathToLoad?: string) => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const loaded = await getNoteByPath(pathToLoad ?? currentPath);
        setNote(loaded);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown error",
        );
        setNote(null);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPath],
  );

  useEffect(() => {
    refreshNote();
  }, [refreshNote]);

  async function handleDuplicate() {
    if (!note) {
      return;
    }

    try {
      const duplicatedPath = await duplicateNoteFile(note.path);
      onNoteChanged?.(duplicatedPath);
      await showToast({
        style: Toast.Style.Success,
        title: "Note duplicated",
        message: duplicatedPath.split("/").pop(),
      });
      push(
        <NoteDetailView
          notePath={duplicatedPath}
          onNoteChanged={onNoteChanged}
          onNoteDeleted={onNoteDeleted}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to duplicate note",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleDelete() {
    if (!note) {
      return;
    }

    const confirmed = await confirmAlert({
      title: "Move note to Trash?",
      message: note.filename,
      primaryAction: {
        title: "Move to Trash",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await moveToTrash(note.path);
      onNoteDeleted?.(note.path);
      await showToast({
        style: Toast.Style.Success,
        title: "Note moved to Trash",
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete note",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleCopy() {
    if (!note) {
      return;
    }

    await Clipboard.copy(note.content);
    await showToast({ style: Toast.Style.Success, title: "Note copied" });
  }

  if (errorMessage) {
    return <Detail markdown={`# Unable to open note\n\n${errorMessage}`} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={note?.title || "Note"}
      markdown={note?.content || ""}
      metadata={
        note ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Title" text={note.title} />
            <Detail.Metadata.Label title="Filename" text={note.filename} />
            <Detail.Metadata.Label
              title="Characters"
              text={`${note.characterCount}`}
            />
            <Detail.Metadata.Label
              title="Modified"
              text={formatModifiedDate(note.mtimeMs)}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Path" text={note.path} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Note">
            <Action.Push
              title="Edit Note"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={
                note ? (
                  <NoteEditForm
                    note={note}
                    onSaved={(updatedPath) => {
                      onNoteChanged?.(updatedPath);
                      setCurrentPath(updatedPath);
                      refreshNote(updatedPath);
                    }}
                  />
                ) : (
                  <Detail markdown="Loading..." />
                )
              }
            />
            <Action.Push
              title="Append Text"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              target={
                note ? (
                  <AppendTextForm
                    notePath={note.path}
                    onAppended={(updatedPath) => {
                      onNoteChanged?.(updatedPath);
                      refreshNote();
                    }}
                  />
                ) : (
                  <Detail markdown="Loading..." />
                )
              }
            />
            <Action
              title="Copy Note"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={handleCopy}
            />
            <Action
              title="Duplicate Note"
              icon={Icon.CopyClipboard}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={handleDuplicate}
            />
            <Action
              title="Delete Note"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              style={Action.Style.Destructive}
              onAction={handleDelete}
            />
            <Action
              title="Reveal in Finder"
              icon={Icon.Folder}
              onAction={() => note && showInFinder(note.path)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
