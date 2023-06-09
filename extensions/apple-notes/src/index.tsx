import { useSqlNotes } from "./useSql";
import Notes from "./Notes";

export default function Command() {
  const sqlState = useSqlNotes();
  return <Notes isLoading={sqlState.isLoading} error={sqlState.error} noteItems={sqlState.results} />;
}
