import { useCachedPromise } from "@raycast/utils";
import NotesList from "./components/NotesList";
import api from "./lib/api";

export default function ListMyNotes() {
  const { isLoading, data } = useCachedPromise(() => api.getNoteList());

  return <NotesList notes={data} isLoading={isLoading} />;
}
