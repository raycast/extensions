import { TaskListView } from "./components/TaskListView";

export default function Command() {
  return (
    <TaskListView
      title="Archived Tasks"
      source="archived"
      includeDoneDefault
      emptyTitle="No Archived Tasks"
      emptyDescription="No archived tasks matched this view."
    />
  );
}
