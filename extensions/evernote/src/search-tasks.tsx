import { Detail } from "@raycast/api";
import TasksList from "./components/TasksList";
import { useEvernoteDB } from "./hooks/useEvernoteDB";

export default function Command() {
  const evernoteDB = useEvernoteDB();

  if (!evernoteDB) {
    return <Detail markdown="Loading ..." />;
  }

  return <TasksList evernoteDB={evernoteDB} />;
}
