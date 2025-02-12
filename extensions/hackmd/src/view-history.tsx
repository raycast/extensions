import { useCachedPromise } from "@raycast/utils";
import NotesList from "./components/NotesList";
import api from "./lib/api";

export default function ViewHistory() {
  const { data, isLoading, mutate } = useCachedPromise(() => api.getHistory(), []);

  return <NotesList isLoading={isLoading} notes={data} mutate={mutate} />;
}
