import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showInFinder,
  showToast,
  useNavigation,
} from "@raycast/api";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { NewNoteForm } from "./components/NewNoteForm";
import { NoteEditFormFromPath } from "./components/NoteEditorForm";
import { NoteDetailView } from "./components/NoteDetailView";
import { QuickCaptureForm } from "./components/QuickCaptureForm";
import { getNotesDirectory } from "./lib/config";
import { moveToTrash, readFileUtf8 } from "./lib/fs";
import {
  NoteListItem,
  createDailyIfMissing,
  duplicateNoteFile,
  listMarkdownFileMetadata,
} from "./lib/notes";

function formatModifiedDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export default function BrowseNotesCommand() {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const deferredSearchText = useDeferredValue(searchText);
  const hasShownReadWarning = useRef(false);
  const { push } = useNavigation();

  const reloadNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const notesDir = getNotesDirectory();
      let skippedFiles = 0;
      const files = await listMarkdownFileMetadata(notesDir, () => {
        skippedFiles += 1;
      });
      setNotes(files);
      if (skippedFiles > 0 && !hasShownReadWarning.current) {
        hasShownReadWarning.current = true;
        await showToast({
          style: Toast.Style.Failure,
          title: `Skipped ${skippedFiles} unreadable note${skippedFiles > 1 ? "s" : ""}`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load notes",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadNotes();
  }, [reloadNotes]);

  const filteredNotes = useMemo(() => {
    const query = deferredSearchText.trim().toLowerCase();
    if (!query) {
      return notes;
    }

    return notes.filter((note) => {
      return (
        note.title.toLowerCase().includes(query) ||
        note.filename.toLowerCase().includes(query)
      );
    });
  }, [deferredSearchText, notes]);

  async function handleDuplicate(note: NoteListItem) {
    try {
      const duplicatedPath = await duplicateNoteFile(note.path);
      await reloadNotes();
      await showToast({
        style: Toast.Style.Success,
        title: "Note duplicated",
        message: duplicatedPath.split("/").pop(),
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to duplicate note",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleDelete(note: NoteListItem) {
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
      await reloadNotes();
      await showToast({
        style: Toast.Style.Success,
        title: "Note moved to Trash",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete note",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleOpenToday() {
    try {
      const notesDir = getNotesDirectory();
      const todayPath = await createDailyIfMissing(notesDir);
      push(
        <NoteDetailView
          notePath={todayPath}
          onNoteChanged={() => {
            reloadNotes();
          }}
          onNoteDeleted={() => {
            reloadNotes();
          }}
        />,
      );
      await reloadNotes();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open today's note",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleCopy(path: string) {
    try {
      const content = await readFileUtf8(path);
      await Clipboard.copy(content);
      await showToast({ style: Toast.Style.Success, title: "Note copied" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy note",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for notes..."
      onSearchTextChange={setSearchText}
      navigationTitle="Browse Notes"
    >
      <List.Section
        title="Notes"
        subtitle={`${filteredNotes.length}/${notes.length} Notes`}
      >
        {filteredNotes.map((note) => {
          const accessories: List.Item.Accessory[] = [{ text: note.filename }];

          if (note.isToday) {
            accessories.unshift({
              icon: { source: Icon.CircleFilled, tintColor: Color.Green },
              tooltip: "Today's note",
            });
          }

          return (
            <List.Item
              key={note.path}
              id={note.path}
              title={note.title}
              subtitle={formatModifiedDate(note.mtimeMs)}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Note">
                    <Action.Push
                      title="Open Note"
                      icon={Icon.AppWindow}
                      shortcut={{ modifiers: [], key: "return" }}
                      target={
                        <NoteDetailView
                          notePath={note.path}
                          onNoteChanged={() => {
                            reloadNotes();
                          }}
                          onNoteDeleted={() => {
                            reloadNotes();
                          }}
                        />
                      }
                    />
                    <Action.Push
                      title="Edit Note"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      target={
                        <NoteEditFormFromPath
                          notePath={note.path}
                          onSaved={() => {
                            reloadNotes();
                          }}
                        />
                      }
                    />
                    <Action
                      title="Duplicate Note"
                      icon={Icon.CopyClipboard}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => handleDuplicate(note)}
                    />
                    <Action
                      title="Delete Note"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleDelete(note)}
                    />
                    <Action
                      title="Copy Note"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                      onAction={() => handleCopy(note.path)}
                    />
                    <Action
                      title="Reveal in Finder"
                      icon={Icon.Folder}
                      onAction={() => showInFinder(note.path)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Create">
                    <Action.Push
                      title="New Note"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      target={<NewNoteForm onCreated={() => reloadNotes()} />}
                    />
                    <Action.Push
                      title="Quick Capture"
                      icon={Icon.Bolt}
                      shortcut={{ modifiers: ["cmd"], key: "k" }}
                      target={
                        <QuickCaptureForm onCaptured={() => reloadNotes()} />
                      }
                    />
                    <Action
                      title="Open Today's Note"
                      icon={Icon.Calendar}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                      onAction={handleOpenToday}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
