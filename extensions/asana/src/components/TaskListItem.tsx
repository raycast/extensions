import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { getAvatarIcon, MutatePromise } from "@raycast/utils";
import { format } from "date-fns";
import { Task } from "../api/tasks";
import { getTaskSubtitle } from "../helpers/task";
import TaskActions from "./TaskActions";
import TaskDetail from "./TaskDetail";

type TaskListItemProps = {
  task: Task;
  workspace?: string;
  mutateList: MutatePromise<Task[] | undefined>;
};

export default function TaskListItem({ task, workspace, mutateList }: TaskListItemProps) {
  const keywords = [task.assignee_section.name];

  const accessories: List.Item.Accessory[] = [
    {
      icon: task.assignee ? getAvatarIcon(task.assignee.name || "") : Icon.Person,
      tooltip: task.assignee ? `Assignee: ${task.assignee?.name}` : "Unassigned",
    },
  ];

  if (task.projects.length > 0) {
    keywords.push(...task.projects.map((project) => project.name));
  }

  if (task.due_on) {
    const dueOn = new Date(task.due_on);
    accessories.unshift({
      date: dueOn,
      tooltip: `Due Date: ${format(dueOn, "d MMM yyyy")}`,
    });
  }

  if (task.custom_fields && task.custom_fields.length > 0) {
    const customFieldsAccessories: List.Item.Accessory[] = [];

    task.custom_fields.forEach((field) => {
      if (field.enum_value) {
        customFieldsAccessories.push({
          tooltip: `${field.name}: ${field.enum_value.name}`,
          text: field.enum_value.name,
        });

        keywords.push(field.enum_value.name);
      }
    });

    accessories.unshift(...customFieldsAccessories);
  }

  return (
    <List.Item
      icon={task.completed ? Icon.CheckCircle : Icon.Circle}
      title={task.name}
      subtitle={getTaskSubtitle(task)}
      keywords={keywords}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            target={<TaskDetail task={task} workspace={workspace} mutateList={mutateList} />}
            icon={Icon.Sidebar}
          />

          <TaskActions task={task} workspace={workspace} mutateList={mutateList} />
        </ActionPanel>
      }
    />
  );
}
