import { TaskList } from "./components/TaskList";

export default function Inbox() {
  return <TaskList source={{ kind: "scope", scope: "inbox" }} />;
}
