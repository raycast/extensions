import { useCachedPromise } from "@raycast/utils";
import { attio } from "./attio";
import { List } from "@raycast/api";

export default function Notes() {
  const {
    isLoading,
    data: notes,
    error,
  } = useCachedPromise(
    async () => {
      const { data } = await attio.notes.list({});
      return data;
    },
    [],
    { initialData: [] },
  );
  return (
    <List isLoading={isLoading}>
      {!isLoading && !notes.length && !error ? (
        <List.EmptyView icon="empty/note.svg" title="Notes" description="No notes yet!" />
      ) : (
        notes.map((note) => <List.Item key={note.id.noteId} title={note.title} />)
      )}
    </List>
  );
}
