import { Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { getSelectedNote } from "./api/applescript";
import NoteDetail from "./components/NoteDetail";
import { useNotes } from "./hooks/useNotes";

export default function CurrentNote() {
  const { data: id, isLoading } = usePromise(getSelectedNote);
  const {
    data: { allNotes },
    isLoading: isLoadingNotes,
    mutate,
  } = useNotes();

  if (isLoading) {
    return <Detail isLoading={isLoading || isLoadingNotes} />;
  }

  const note = allNotes?.find((note) => note.id === id);

  if (!id || !note) {
    return <Detail markdown="No note is currently open." />;
  }

  return <NoteDetail note={note} mutate={mutate} />;
}
