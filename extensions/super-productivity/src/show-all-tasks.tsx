import { TaskListView } from "./components/TaskListView";

export default function Command() {
  return (
    <TaskListView
      title="All Tasks"
      source="all"
      includeDoneDefault
      emptyTitle="No Tasks Found"
      emptyDescription="No active or archived tasks matched this view."
    />
  );
}
