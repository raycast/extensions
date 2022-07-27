import { Note } from "@hackmd/api/dist/type";
import { List } from "@raycast/api";

export default function NotesList({ notes, isLoading }: { notes?: Note[]; isLoading: boolean }) {
  return (
    <List isLoading={isLoading}>
      {notes &&
        notes
          .sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf())
          .map((note) => (
            <List.Item
              key={note.id}
              title={note.title}
              subtitle={note.tags?.join(", ")}
              accessories={[
                {
                  date: new Date(note.createdAt),
                },
              ]}
            />
          ))}
    </List>
  );
}
