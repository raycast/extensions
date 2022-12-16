import { Note } from "@hackmd/api/dist/type";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import NoteDetail from "./NoteDetail";
import NoteActions from "./NoteActions";

export default function NoteListItem({ note, mutate }: { note: Note; mutate?: () => void }) {
  return (
    <List.Item
      key={note.id}
      title={note.title}
      subtitle={note.tags?.join(", ")}
      icon={Icon.Document}
      accessories={[
        {
          date: new Date(note.lastChangedAt || note.createdAt),
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Sidebar}
            target={<NoteDetail noteId={note.id} mutate={mutate} />}
            title="View Detail"
          />

          {note && <NoteActions note={note} mutate={mutate} onDeleteCallback={mutate} />}
        </ActionPanel>
      }
    />
  );
}
