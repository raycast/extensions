import { Action, ActionPanel, List } from "@raycast/api";
import { Filter, Task, TaskForm } from "../types";
import CreateTaskForm from "./CreateTaskForm";

export default function EmptyView(props: {
  listId: string;
  tasks: Task[];
  filter: Filter;
  searchText: string;
  onCreate: (listId: string, task: TaskForm) => void;
}) {
  const createAction = (
    <Action.Push
      title="Create Task"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateTaskForm listId={props.listId} title={props.searchText} onCreate={props.onCreate} />}
    />
  );

  if (props.tasks.length > 0) {
    return (
      <List.EmptyView
        icon="💬"
        title="No Matching Tasks"
        description={`Can't find a task matching ${props.searchText}.\nCreate it now!`}
        actions={<ActionPanel>{createAction}</ActionPanel>}
      />
    );
  }
  switch (props.filter) {
    case Filter.Open:
      return (
        <List.EmptyView
          icon="✅"
          title="All Done"
          description="All tasks complete!"
          actions={<ActionPanel>{createAction}</ActionPanel>}
        />
      );
    case Filter.Completed:
      return <List.EmptyView icon="😢" title="No Tasks Completed" description="No tasks complete." />;

    case Filter.All:
    default:
      return (
        <List.EmptyView
          icon="📝"
          title="No Tasks Found"
          description="You don't have any tasks yet."
          actions={<ActionPanel>{createAction}</ActionPanel>}
        />
      );
      break;
  }
}
