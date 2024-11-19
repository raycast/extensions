import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Task, TaskForm } from "../types";
import { getChildren, getIcon } from "../utils";
import CreateTaskForm from "./CreateTaskForm";
import EditTaskForm from "./EditTaskForm";

export default function TaskItem(props: {
  listId: string;
  tasks: Task[];
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onCreate: (listId: string, task: TaskForm) => void;
  onEdit: (listId: string, task: Task) => void;
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
                title={props.task.due === undefined ? "" : new Date(props.task.due).toLocaleDateString()}
                icon={Icon.Calendar}
              />
              <List.Item.Detail.Metadata.Separator />
              {getChildren(props.task, props.tasks).map((child) => {
                return <List.Item.Detail.Metadata.Label title={child.title} icon={getIcon(child)} />;
              })}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action title="Complete Task" icon={Icon.CheckCircle} onAction={props.onToggle} />
          <Action
            title="Delete Task"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={props.onDelete}
          />
          <Action.Push
            title="Create Task"
            icon={Icon.NewDocument}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<CreateTaskForm listId={props.listId} onCreate={props.onCreate} />}
          />
          <Action.Push
            title="Edit Task"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<EditTaskForm listId={props.listId} task={props.task} onEdit={props.onEdit} />}
          />
        </ActionPanel>
      }
    />
  );
}
