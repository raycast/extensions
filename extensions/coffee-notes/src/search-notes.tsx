import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useMemo, useState } from "react";
import { COFFEE, listNotes, Note, notesFolder, openInCoffee, previewNote, readNote } from "./coffee";

/** The notes, or why they couldn't be listed. */
function loadNotes(): { root?: string; notes: Note[]; problem?: string; fixInPreferences?: boolean } {
  const folder = notesFolder();
  if ("problem" in folder) return { notes: [], problem: folder.problem, fixInPreferences: folder.fixInPreferences };
  try {
    return { root: folder.path, notes: listNotes(folder.path) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      root: folder.path,
      notes: [],
      problem: `Raycast can't read ${folder.path}: ${reason}`,
      fixInPreferences: true,
    };
  }
}

export default function SearchNotes() {
  const [attempt, setAttempt] = useState(0);
  const loaded = useMemo(() => loadNotes(), [attempt]);
  const [showingDetail, setShowingDetail] = useState(true);
  // Only the note being looked at is read from disk.
  const [selected, setSelected] = useState<string | null>(null);
  const preview = useMemo(() => (selected && showingDetail ? previewNote(selected) : ""), [selected, showingDetail]);

  if (loaded.problem) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Can't Read Your Notes"
          description={loaded.problem}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => setAttempt((n) => n + 1)} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search notes by title or folder"
      onSelectionChange={(id) => setSelected(id)}
    >
      <List.EmptyView icon="extension-icon.png" title="No Notes Yet" description={`Nothing in ${loaded.root}`} />
      {loaded.notes.map((note) => (
        <NoteItem
          key={note.path}
          note={note}
          preview={note.path === selected ? preview : ""}
          showingDetail={showingDetail}
          toggle={() => setShowingDetail((s) => !s)}
        />
      ))}
    </List>
  );
}

/** The whole note on the clipboard, or an error and the clipboard left as it was. */
async function copyNote(note: Note) {
  let text: string;
  try {
    text = readNote(note.path);
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Read the Note" });
    return;
  }
  await Clipboard.copy(text);
  await showHUD("Copied");
}

function NoteItem({
  note,
  preview,
  showingDetail,
  toggle,
}: {
  note: Note;
  preview: string;
  showingDetail: boolean;
  toggle: () => void;
}) {
  return (
    <List.Item
      id={note.path}
      title={note.title}
      subtitle={showingDetail ? undefined : note.folder}
      keywords={note.folder.split("/")}
      icon={Icon.Document}
      accessories={showingDetail ? undefined : [{ date: note.modified }]}
      detail={showingDetail ? <List.Item.Detail markdown={preview} /> : undefined}
      actions={
        <ActionPanel>
          <Action title="Open in Coffee" icon={COFFEE} onAction={() => openInCoffee(note.path)} />
          <Action.Push title="Read Here" icon={Icon.Eye} target={<NoteDetail note={note} />} />
          <Action
            title={showingDetail ? "Hide Preview" : "Show Preview"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={toggle}
          />
          <Action.CopyToClipboard
            title="Copy Link to Note"
            content={`[[${note.title}]]`}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
          <Action
            title="Copy Text"
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={() => copyNote(note)}
          />
          <Action.ShowInFinder path={note.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
        </ActionPanel>
      }
    />
  );
}

function NoteDetail({ note }: { note: Note }) {
  const text = useMemo(() => previewNote(note.path), [note.path]);
  return <Detail markdown={text} navigationTitle={note.title} />;
}
