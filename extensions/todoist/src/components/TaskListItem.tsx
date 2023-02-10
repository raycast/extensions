import { Project, Task } from "@doist/todoist-api-typescript";
import { ActionPanel, Icon, List, Action, Color } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";
import removeMarkdown from "remove-markdown";

import { priorities, ViewMode } from "../constants";
import { isRecurring, displayDueDate, isExactTimeTask } from "../helpers/dates";
import { GroupByProp } from "../helpers/groupBy";
import { getProjectIcon } from "../helpers/projects";

import TaskActions from "./TaskActions";
import TaskDetail from "./TaskDetail";

interface TaskListItemProps {
  task: Task;
  mode?: ViewMode;
  projects?: Project[];
  groupBy?: GroupByProp;
  mutateTasks: MutatePromise<Task[] | undefined>;
}

export default function TaskListItem({ task, mode, projects, groupBy, mutateTasks }: TaskListItemProps): JSX.Element {
  const accessories: List.Item.Accessory[] = [];
  const keywords: string[] = [];

  if (mode === ViewMode.date || mode === ViewMode.search) {
    if (projects && projects.length > 0) {
      const project = projects.find((project) => project.id === task.projectId);

      if (project) {
        accessories.push({ icon: getProjectIcon(project), text: project.name, tooltip: `Project: ${project.name}` });
        keywords.push(project.name);
      }
    }
  }

  if (mode === ViewMode.project || mode === ViewMode.search) {
    if (task.due?.date) {
      const text = displayDueDate(task.due.date);
      accessories.push({ icon: Icon.Calendar, text, tooltip: `Due date: ${text}` });
    }
  }

  if (isExactTimeTask(task)) {
    const time = task.due?.datetime as string;
    const text = format(new Date(time), "HH:mm");

    accessories.push({ icon: Icon.Clock, text, tooltip: `Due time: ${text}` });
  }

  if (isRecurring(task)) {
    accessories.push({ icon: Icon.ArrowClockwise, tooltip: "Recurring task" });
  }

  if (task.labels && task.labels.length > 0) {
    accessories.push({
      icon: { source: "tag.svg", tintColor: Color.SecondaryText },
      tooltip: `${task.labels.join(", ")}`,
    });
  }

  if (task.commentCount > 0) {
    accessories.push({
      icon: Icon.Bubble,
      tooltip: `${task.commentCount} comment${task.commentCount === 1 ? "" : "s"}`,
    });
  }

  const priority = priorities.find((p) => p.value === task.priority);

  let icon;
  if (priority) {
    const priorityIcon = priority.value === 1 ? Icon.Circle : { source: Icon.Circle, tintColor: priority.color };
    keywords.push(priority.searchKeyword);
    icon = { value: priorityIcon, tooltip: priority.name };
  }

  return (
    <List.Item
      title={removeMarkdown(task.content)}
      subtitle={task.description}
      icon={icon}
      keywords={keywords}
      accessories={accessories}
      actions={
        <ActionPanel title={task.content}>
          <Action.Push
            title="Show Details"
            target={<TaskDetail taskId={task.id} mutateTasks={mutateTasks} />}
            icon={Icon.Sidebar}
          />

          <TaskActions task={task} mutateTasks={mutateTasks} projects={projects} groupBy={groupBy} mode={mode} />
        </ActionPanel>
      }
    />
  );
}
