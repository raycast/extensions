import { Detail } from "@raycast/api";
import NotesList from "./components/NotesList";
import { useEvernoteDB } from "./hooks/useEvernoteDB";

export default function Command() {
  const evernoteDB = useEvernoteDB();

  if (!evernoteDB) {
    return <Detail markdown="Loading ..." />;
  }
  return <NotesList evernoteDB={evernoteDB} />;
}
