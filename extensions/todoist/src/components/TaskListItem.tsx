import { ActionPanel, Icon, List, Action, Color } from "@raycast/api";
import { format } from "date-fns";
import { Project, Task } from "@doist/todoist-api-typescript";
import { ViewMode } from "../types";
import { isRecurring, displayDueDate, isExactTimeTask } from "../utils";
import { priorities } from "../constants";
import TaskDetail from "./TaskDetail";

import TaskActions from "./TaskActions";

interface TaskListItemProps {
  task: Task;
  mode: ViewMode;
  projects?: Project[];
}

export default function TaskListItem({ task, mode, projects }: TaskListItemProps): JSX.Element {
  const additionalListItemProps: Partial<List.Item.Props> & { keywords: string[]; accessories: List.Item.Accessory[] } =
    { keywords: [], accessories: [] };

  switch (mode) {
    case ViewMode.project:
      if (task.due?.date) {
        additionalListItemProps.accessories.push({ text: displayDueDate(task.due.date) });
      }
      break;
    case ViewMode.date:
      if (projects && projects.length > 0) {
        const project = projects.find((project) => project.id === task.projectId);
        if (project) {
          additionalListItemProps.accessories.push({ text: project.name });
          additionalListItemProps.keywords.push(project.name);
        }
      }
  }

  if (isExactTimeTask(task)) {
    const time = task.due?.datetime as string;
    additionalListItemProps.accessories.push({
      icon: Icon.Clock,
      text: format(new Date(time), "HH:mm"),
    });
  }

  if (isRecurring(task)) {
    additionalListItemProps.accessories.push({ icon: Icon.ArrowClockwise });
  }

  if (task.labelIds.length > 0) {
    additionalListItemProps.accessories.push({ icon: { source: "tag.svg", tintColor: Color.SecondaryText } });
  }

  const priority = priorities.find((p) => p.value === task.priority);

  if (priority) {
    const icon = priority.value === 1 ? Icon.Circle : { source: Icon.Circle, tintColor: priority.color };
    additionalListItemProps.keywords.push(priority.searchKeyword);
    additionalListItemProps.icon = icon;
  }

  return (
    <List.Item
      title={task.content}
      subtitle={task.description}
      {...additionalListItemProps}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push title="Show Details" target={<TaskDetail task={task} />} icon={Icon.Sidebar} />
          </ActionPanel.Section>

          <TaskActions task={task} />
        </ActionPanel>
      }
    />
  );
}
