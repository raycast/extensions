import { Note } from "@hackmd/api/dist/type";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import NoteDetail from "./NoteDetail";

export default function NoteListItem({ note }: { note: Note }) {
  return (
    <List.Item
      key={note.id}
      title={note.title}
      subtitle={note.tags?.join(", ")}
      icon={Icon.Document}
      accessories={[
        {
          date: new Date(note.createdAt),
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push target={<NoteDetail noteId={note.id} />} title="View Detail" />
        </ActionPanel>
      }
    />
  );
}
