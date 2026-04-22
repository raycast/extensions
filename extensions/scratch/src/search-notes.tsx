import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Icon,
  List,
  Toast,
  confirmAlert,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";

import { deleteNote, getDoctorReport, getErrorMessage, listNotes, type ScratchNoteSummary } from "./api/scratch";

function relativeModified(timestamp: number): string {
  const deltaSeconds = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);

  if (deltaSeconds < 60) {
    return "just now";
  }
  if (deltaSeconds < 3600) {
    return `${Math.floor(deltaSeconds / 60)}m ago`;
  }
  if (deltaSeconds < 86400) {
    return `${Math.floor(deltaSeconds / 3600)}h ago`;
  }
  return `${Math.floor(deltaSeconds / 86400)}d ago`;
}

export default function SearchNotesCommand() {
  const [items, setItems] = useState<ScratchNoteSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [notesFolder, setNotesFolder] = useState<string>();

  async function loadNotes() {
    setIsLoading(true);
    setErrorMessage(undefined);

    try {
      const [doctor, notes] = await Promise.all([getDoctorReport(), listNotes()]);
      setNotesFolder(doctor.notesFolder ?? undefined);
      setItems(notes);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadNotes();
  }, []);

  async function handleDelete(note: ScratchNoteSummary) {
    const confirmed = await confirmAlert({
      title: "Delete note?",
      message: note.title,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting note",
    });

    try {
      await deleteNote(note.id);
      setItems((current) => current.filter((item) => item.id !== note.id));
      toast.style = Toast.Style.Success;
      toast.title = "Note deleted";
      toast.message = note.title;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete note";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Scratch notes" isShowingDetail={items.length > 0}>
      {errorMessage ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Scratch CLI unavailable"
          description={errorMessage}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Retry" onAction={loadNotes} />
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : null}

      {!errorMessage && items.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No notes found"
          description={notesFolder ? `Vault: ${notesFolder}` : "Open Scratch first so the CLI can find your vault."}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={loadNotes} />
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : null}

      {items.map((note) => (
        <List.Item
          key={note.id}
          icon={Icon.Document}
          title={note.title}
          subtitle={note.id}
          accessories={[{ text: relativeModified(note.modified) }]}
          detail={
            <List.Item.Detail
              markdown={`### ${note.title}\n\n${note.preview || "_No preview_"}\n\n---\n\n\`${note.path}\``}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="ID" text={note.id} />
                  <List.Item.Detail.Metadata.Label title="Path" text={note.path} />
                  <List.Item.Detail.Metadata.Label title="Modified" text={relativeModified(note.modified)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action icon={Icon.Document} title="Open Note" onAction={() => open(note.path)} />
              <Action icon={Icon.Clipboard} title="Copy Path" onAction={() => Clipboard.copy(note.path)} />
              <Action
                title="Delete Note"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(note)}
              />
              <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={loadNotes} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
