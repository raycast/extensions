import { Action, ActionPanel, List } from "@raycast/api";
import { Filter, Task } from "../types";
import TaskForm from "./TaskForm";

export default function EmptyView(props: {
  listId: string;
  tasks: Task[];
  filter: Filter;
  searchText: string;
}) {
  if (props.tasks.length > 0) {
    return (
      <List.EmptyView
        icon="💬"
        title="No Matching Tasks"
        description={`Can't find a task matching ${props.searchText}.\nCreate it now!`}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Task"
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={
                <TaskForm listId={props.listId} title={props.searchText} />
              }
            />
          </ActionPanel>
        }
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
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Task"
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={
                  <TaskForm listId={props.listId} title={props.searchText} />
                }
              />
            </ActionPanel>
          }
        />
      );
    case Filter.Completed:
      return (
        <List.EmptyView
          icon="😢"
          title="No Tasks Completed"
          description="No tasks complete."
        />
      );

    case Filter.All:
    default:
      return (
        <List.EmptyView
          icon="📝"
          title="No Tasks Found"
          description="You don't have any tasks yet."
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Task"
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={
                  <TaskForm listId={props.listId} title={props.searchText} />
                }
              />
            </ActionPanel>
          }
        />
      );
      break;
  }
}
