import { ActionPanel, Icon, List, Action, Color } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";
import { Project, Task } from "@doist/todoist-api-typescript";
import removeMarkdown from "remove-markdown";
import { ViewMode } from "../types";
import { isRecurring, displayDueDate, isExactTimeTask } from "../helpers/dates";
import { priorities } from "../constants";
import TaskDetail from "./TaskDetail";

import TaskActions from "./TaskActions";
import CreateTask from "../create-task";

interface TaskListItemProps {
  task: Task;
  mode: ViewMode;
  projects?: Project[];
  mutateTasks: MutatePromise<Task[] | undefined>;
}

export default function TaskListItem({ task, mode, projects, mutateTasks }: TaskListItemProps): JSX.Element {
  const additionalListItemProps: Partial<List.Item.Props> & { keywords: string[]; accessories: List.Item.Accessory[] } =
    { keywords: [], accessories: [] };

  if (mode === ViewMode.date || mode === ViewMode.search) {
    if (projects && projects.length > 0) {
      const project = projects.find((project) => project.id === task.projectId);

      if (project) {
        additionalListItemProps.accessories.push({ text: project.name, tooltip: `Project: ${project.name}` });
        additionalListItemProps.keywords.push(project.name);
      }
    }
  }

  if (mode === ViewMode.project || mode === ViewMode.search) {
    if (task.due?.date) {
      const text = displayDueDate(task.due.date);
      additionalListItemProps.accessories.push({ text, tooltip: `Due date: ${text}` });
    }
  }

  if (isExactTimeTask(task)) {
    const time = task.due?.datetime as string;
    const text = format(new Date(time), "HH:mm");

    additionalListItemProps.accessories.push({
      icon: Icon.Clock,
      text,
      tooltip: `Due time: ${text}`,
    });
  }

  if (isRecurring(task)) {
    additionalListItemProps.accessories.push({
      icon: Icon.ArrowClockwise,
      tooltip: "Recurring task",
    });
  }

  if (task.labels && task.labels.length > 0) {
    additionalListItemProps.accessories.push({
      icon: { source: "tag.svg", tintColor: Color.SecondaryText },
      tooltip: `${task.labels.length} label${task.labels.length === 1 ? "" : "s"}`,
    });
  }

  if (task.commentCount > 0) {
    additionalListItemProps.accessories.push({
      icon: Icon.Bubble,
      tooltip: `${task.commentCount} comment${task.commentCount === 1 ? "" : "s"}`,
    });
  }

  const priority = priorities.find((p) => p.value === task.priority);

  if (priority) {
    const icon = priority.value === 1 ? Icon.Circle : { source: Icon.Circle, tintColor: priority.color };
    additionalListItemProps.keywords.push(priority.searchKeyword);
    additionalListItemProps.icon = { value: icon, tooltip: priority.name };
  }

  return (
    <List.Item
      title={removeMarkdown(task.content)}
      subtitle={task.description}
      {...additionalListItemProps}
      actions={
        <ActionPanel title={task.content}>
          <Action.Push
            title="Show Details"
            target={<TaskDetail taskId={task.id} mutateTasks={mutateTasks} />}
            icon={Icon.Sidebar}
          />

          <TaskActions task={task} mutateTasks={mutateTasks} />

          {mode === ViewMode.project ? (
            <Action.Push
              title="Add New Task"
              target={<CreateTask fromProjectId={task.projectId} />}
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
