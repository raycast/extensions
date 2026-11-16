import { Action, ActionPanel, Clipboard, Detail, Icon, Keyboard, List, showHUD } from "@raycast/api";
import { useMemo, useState } from "react";
import { listNotes, Note, notesFolder, openInCoffee, readNote } from "./coffee";

export default function SearchNotes() {
  const root = useMemo(() => notesFolder(), []);
  const notes = useMemo(() => (root ? listNotes(root) : []), [root]);
  const [showingDetail, setShowingDetail] = useState(true);
  // Only the note being looked at is read from disk.
  const [selected, setSelected] = useState<string | null>(null);
  const preview = useMemo(() => (selected && showingDetail ? readNote(selected) : ""), [selected, showingDetail]);

  if (!root) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Folder}
          title="No notes folder found"
          description="Open Coffee once to choose a folder, or choose it in this extension's preferences."
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
      <List.EmptyView icon={Icon.Document} title="No notes yet" description={`Nothing in ${root}`} />
      {notes.map((note) => (
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
          <Action title="Open in Coffee" icon={Icon.ArrowRight} onAction={() => openInCoffee(note.path)} />
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
            onAction={async () => {
              await Clipboard.copy(readNote(note.path));
              await showHUD("Copied");
            }}
          />
          <Action.ShowInFinder path={note.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
        </ActionPanel>
      }
    />
  );
}

function NoteDetail({ note }: { note: Note }) {
  const text = useMemo(() => readNote(note.path), [note.path]);
  return <Detail markdown={text} navigationTitle={note.title} />;
}
