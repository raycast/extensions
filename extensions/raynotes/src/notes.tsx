import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  trash,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { Editor } from "./components/editor";
import { Note, scanNotes } from "./lib/notes";
import { notesRoot } from "./lib/prefs";

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function Notes() {
  const [root] = useState(notesRoot);
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(() => {
    setNotes(scanNotes(root));
    setIsLoading(false);
  }, [root]);

  useEffect(reload, [reload]);

  // Content is already in memory, so searching it costs nothing extra.
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? notes.filter((note) => note.title.toLowerCase().includes(needle) || note.content.toLowerCase().includes(needle))
    : notes;

  async function remove(note: Note) {
    const confirmed = await confirmAlert({
      title: "Delete note?",
      message: `"${note.title}" moves to the Trash.`,
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await trash(note.path);
      reload();
      await showToast({ style: Toast.Style.Success, title: "Moved to Trash" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not delete", message: describe(error) });
    }
  }

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search notes"
    >
      <List.EmptyView
        title={needle ? "No matching notes" : "No notes yet"}
        description="Press ⌘N to write one"
        icon={Icon.BlankDocument}
        actions={
          <ActionPanel>
            <NewNoteAction root={root} onSaved={reload} />
          </ActionPanel>
        }
      />

      {visible.map((note) => (
        <List.Item
          key={note.path}
          title={note.title}
          subtitle={note.folder}
          detail={<List.Item.Detail markdown={note.content} />}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Pencil}
                title="Edit Note"
                target={<PushedEditor root={root} note={note} onSaved={reload} />}
              />
              <NewNoteAction root={root} onSaved={reload} />
              <Action.Open
                icon={Icon.AppWindow}
                title="Open in Editor"
                target={note.path}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
              <Action.ShowInFinder path={note.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
              <Action.CopyToClipboard
                title="Copy Path"
                content={note.path}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
              <Action
                icon={Icon.Trash}
                title="Delete Note"
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => remove(note)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function NewNoteAction({ root, onSaved }: { root: string; onSaved: () => void }) {
  return (
    <Action.Push
      icon={Icon.Plus}
      title="New Note"
      shortcut={Keyboard.Shortcut.Common.New}
      target={<PushedEditor root={root} onSaved={onSaved} />}
    />
  );
}

/** Saving returns to the list here, unlike the standalone New Note command. */
function PushedEditor({ root, note, onSaved }: { root: string; note?: Note; onSaved: () => void }) {
  const { pop } = useNavigation();
  return <Editor root={root} note={note} onSaved={onSaved} onClose={pop} />;
}
