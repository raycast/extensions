import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Task } from "../types";
import { getChildren, getIcon } from "../utils";
import TaskForm from "./TaskForm";

export default function TaskItem(props: {
  listId: string;
  tasks: Task[];
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <List.Item
      key={props.task.id}
      icon={getIcon(props.task)}
      id={props.task.id}
      title={props.task.title}
      accessories={[
        {
          date: props.task.due === undefined ? null : new Date(props.task.due),
        },
      ]}
      detail={
        <List.Item.Detail
          markdown={`# ${props.task.title}
      \n\n${props.task.notes || ""}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title={
                  props.task.due === undefined
                    ? ""
                    : new Date(props.task.due).toLocaleString()
                }
                icon={Icon.Calendar}
              />
              <List.Item.Detail.Metadata.Separator />
              {getChildren(props.task, props.tasks).map((child) => {
                return (
                  <List.Item.Detail.Metadata.Label
                    title={child.title}
                    icon={getIcon(child)}
                  />
                );
              })}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action title="Toggle Task" onAction={props.onToggle} />
          <Action
            title="Delete Task"
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={props.onDelete}
          />
          <Action.Push
            title="Create Task"
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<TaskForm listId={props.listId} />}
          />
        </ActionPanel>
      }
    />
  );
}
