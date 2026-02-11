import { ActionPanel, Icon, List, Action, Color } from "@raycast/api";
import removeMarkdown from "remove-markdown";

import { SyncData, Task } from "../api";
import { getCollaboratorIcon } from "../helpers/collaborators";
import { getColorByKey } from "../helpers/colors";
import { displayTime, displayDate, isExactTimeTask, isOverdue, isRecurring } from "../helpers/dates";
import { getPriorityIcon, priorities } from "../helpers/priorities";
import { displayReminderName } from "../helpers/reminders";
import { ViewMode } from "../helpers/tasks";
import { QuickLinkView } from "../home";
import { ViewProps } from "../hooks/useViewTasks";

import TaskActions from "./TaskActions";
import TaskDetail from "./TaskDetail";

type TaskListItemProps = {
  task: Task;
  mode?: ViewMode;
  viewProps?: ViewProps;
  data?: SyncData;
  setData: React.Dispatch<React.SetStateAction<SyncData | undefined>>;
  quickLinkView?: QuickLinkView;
};

export default function TaskListItem({ task, mode, viewProps, data, setData, quickLinkView }: TaskListItemProps) {
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
      icon: { source: Icon.Tag, tintColor: Color.SecondaryText },
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

  if (task.deadline?.date) {
    const text = displayDate(task.deadline.date);
    const overdue = isOverdue(task.deadline.date);

    accessories.unshift({
      icon: {
        source: overdue ? Icon.BullsEyeMissed : Icon.BullsEye,
        tintColor: overdue ? Color.Red : Color.PrimaryText,
      },
      tooltip: `Deadline: ${text}`,
      text,
    });
  }

  if (task.due?.date) {
    const exactTime = isExactTimeTask(task);
    const recurring = isRecurring(task);
    const overdue = isOverdue(task.due.date);
    const use12HourFormat = data?.user?.time_format === 1;

    const text = displayDate(task.due.date);

    if (mode === ViewMode.date && recurring) {
      accessories.unshift({ icon: Icon.ArrowClockwise, tooltip: `Recurring task` });
    }

    if (mode === ViewMode.date && exactTime) {
      const time = displayTime(task.due.date, use12HourFormat);

      accessories.unshift({ icon: Icon.Clock, text: time, tooltip: `Due time: ${time}` });
    }

    if (isOverdue(task.due.date) || mode !== ViewMode.date) {
      accessories.unshift({
        icon: {
          source: recurring ? Icon.ArrowClockwise : Icon.Calendar,
          tintColor: overdue ? Color.Red : Color.PrimaryText,
        },
        tooltip: `${recurring ? "Next date" : "Date"}: ${text}`,
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
    const use12HourFormat = data?.user?.time_format === 1;
    accessories.unshift({
      icon: Icon.Alarm,
      tooltip: `${reminders.length} reminder${reminders.length === 1 ? "" : "s"}: ${reminders
        .map((r) => displayReminderName(r, use12HourFormat))
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

          <TaskActions
            task={task}
            viewProps={viewProps}
            mode={mode}
            data={data}
            setData={setData}
            quickLinkView={quickLinkView}
          />
        </ActionPanel>
      }
    />
  );
}
