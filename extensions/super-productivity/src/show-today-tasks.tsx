import { TaskListView } from "./components/TaskListView";
import { TODAY_TAG_ID } from "./components/task-format";

export default function Command() {
  return (
    <TaskListView
      title="Today Tasks"
      tagId={TODAY_TAG_ID}
      emptyTitle="No Today Tasks"
      emptyDescription="No active tasks are scheduled for today."
    />
  );
}
