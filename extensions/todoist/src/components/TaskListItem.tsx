import { ActionPanel, Icon, List, Action, Color } from "@raycast/api";
import { format } from "date-fns";
import removeMarkdown from "remove-markdown";

import { Task } from "../api";
import { getCollaboratorIcon } from "../helpers/collaborators";
import { getColorByKey } from "../helpers/colors";
import { isRecurring, displayDueDate, isExactTimeTask, displayDueDateTime, isOverdue } from "../helpers/dates";
import { getPriorityIcon, priorities } from "../helpers/priorities";
import { displayReminderName } from "../helpers/reminders";
import { QuickLinkView, ViewMode } from "../home";
import useCachedData from "../hooks/useCachedData";
import { ViewProps } from "../hooks/useViewTasks";

import TaskActions from "./TaskActions";
import TaskDetail from "./TaskDetail";

type TaskListItemProps = {
  task: Task;
  mode?: ViewMode;
  viewProps?: ViewProps;
  quickLinkView?: QuickLinkView;
};

export default function TaskListItem({ task, mode, viewProps, quickLinkView }: TaskListItemProps): JSX.Element {
  const [data] = useCachedData();

  const taskComments = data?.notes.filter((note) => note.item_id === task.id);
  const accessories: List.Item.Accessory[] = [];
  const keywords: string[] = [];

  if (mode !== ViewMode.project) {
    const project = data?.projects.find((project) => project.id === task.project_id);
    const section = data?.sections.find((section) => section.id === task.section_id);

    if (project) {
      const name = `${project.name}${section ? ` / ${section.name}` : ""}`;
      accessories.unshift({
        tag: {
          value: name,
          color: getColorByKey(project.color).value,
        },
        tooltip: `Project: ${name}`,
      });
      keywords.push(project.name);
    }
  }

  const collaborator = data?.collaborators.find((collaborator) => task.responsible_uid === collaborator.id);

  if (collaborator) {
    accessories.unshift({
      icon: getCollaboratorIcon(collaborator),
      tooltip: `Assigned to: ${collaborator.full_name}`,
    });
  }

  if (task.labels && task.labels.length > 0) {
    accessories.unshift({
      icon: { source: "tag.svg", tintColor: Color.SecondaryText },
      text: `${task.labels.length}`,
      tooltip: `${task.labels.join(", ")}`,
    });

    keywords.push(...task.labels);
  }

  if (taskComments && taskComments.length > 0) {
    accessories.unshift({
      icon: Icon.Bubble,
      text: taskComments.length.toString(),
      tooltip: `${taskComments.length} comment${taskComments.length === 1 ? "" : "s"}`,
    });
  }

  if (task.due?.date) {
    const exactTime = isExactTimeTask(task);
    const recurring = isRecurring(task);
    const overdue = isOverdue(new Date(task.due.date));

    const text = exactTime ? displayDueDateTime(task.due.date) : displayDueDate(task.due.date);

    if (mode === ViewMode.date && recurring) {
      accessories.unshift({ icon: Icon.ArrowClockwise, tooltip: `Recurring task` });
    }

    if (mode === ViewMode.date && exactTime) {
      const time = task.due?.date as string;
      const text = format(new Date(time), "HH:mm");

      accessories.unshift({ icon: Icon.Clock, text, tooltip: `Due time: ${text}` });
    }

    if (isOverdue(new Date(task.due.date)) || mode !== ViewMode.date) {
      accessories.unshift({
        icon: {
          source: recurring ? Icon.ArrowClockwise : Icon.Calendar,
          tintColor: overdue ? Color.Red : Color.PrimaryText,
        },
        tooltip: `${recurring ? "Next due" : "Due"} date: ${text}`,
        text,
      });
    }
  }

  const subTasks = data?.items.filter((item) => item.parent_id === task.id);

  if (subTasks && subTasks?.length > 0) {
    accessories.unshift({
      icon: { source: "sub-task.svg", tintColor: Color.SecondaryText },
      text: `${subTasks.length}`,
      tooltip: `${subTasks.length} sub-tasks`,
    });
  }

  const priority = priorities.find((p) => p.value === task.priority);
  if (priority) {
    keywords.push(...priority.keywords);
  }

  const reminders =
    data?.reminders.filter((r) => {
      if (r.is_deleted === 1) return false;

      return r.item_id === task.id;
    }) ?? [];

  if (reminders.length > 0) {
    accessories.unshift({
      icon: Icon.Alarm,
      tooltip: `${reminders.length} reminder${reminders.length === 1 ? "" : "s"}: ${reminders
        .map(displayReminderName)
        .join(", ")}`,
      ...(reminders.length > 1 ? { text: `${reminders.length}` } : {}),
    });
  }

  return (
    <List.Item
      title={removeMarkdown(task.content)}
      subtitle={task.description}
      icon={getPriorityIcon(task)}
      keywords={keywords}
      accessories={accessories}
      actions={
        <ActionPanel title={task.content}>
          <Action.Push title="Show Details" target={<TaskDetail taskId={task.id} />} icon={Icon.Sidebar} />

          <TaskActions task={task} viewProps={viewProps} mode={mode} quickLinkView={quickLinkView} />
        </ActionPanel>
      }
    />
  );
}
