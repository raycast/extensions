import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { Project, Task } from "../api";
import { colorHex } from "../helpers/colors";
import { displayDate, displayDue } from "../helpers/dates";
import { getPriorityIcon } from "../helpers/priorities";
import TaskActions from "./TaskActions";

type TaskListItemProps = {
  task: Task;
  today: string;
  mutate: () => Promise<unknown>;
  projects?: Project[];
  showProject?: boolean;
  subtitle?: string;
  timeFormat?: "12h" | "24h";
};

export default function TaskListItem({
  task,
  today,
  mutate,
  projects,
  showProject = true,
  subtitle,
  timeFormat,
}: TaskListItemProps) {
  const project = projects?.find((p) => p.id === task.project_id);
  const accessories: List.Item.Accessory[] = [];

  if (task.completed_at) {
    accessories.push({
      icon: Icon.CheckCircle,
      text: displayDate(task.completed_at.slice(0, 10), today),
      tooltip: `Completed ${task.completed_at.slice(0, 10)}`,
    });
  } else {
    if (task.due) {
      const overdue = task.due.date < today;
      accessories.push({
        icon: task.due.is_recurring ? Icon.ArrowClockwise : Icon.Calendar,
        text: { value: displayDue(task.due, today, timeFormat), color: overdue ? Color.Red : Color.SecondaryText },
        tooltip: `Due ${task.due.date}${task.due.time ? ` ${task.due.time}` : ""}`,
      });
    }
    if (task.deadline_date) {
      const missed = task.deadline_date < today;
      accessories.push({
        icon: Icon.BullsEye,
        text: {
          value: displayDate(task.deadline_date, today),
          color: missed ? Color.Red : Color.SecondaryText,
        },
        tooltip: `Deadline ${task.deadline_date}${task.deadline_time ? ` ${task.deadline_time}` : ""}`,
      });
    }
  }

  if (task.labels.length > 0) {
    accessories.push({ icon: Icon.Tag, text: String(task.labels.length), tooltip: task.labels.join(", ") });
  }

  if (showProject && project) {
    accessories.push({
      tag: {
        value: project.is_inbox ? "Inbox" : project.name,
        color: project.is_inbox ? Color.SecondaryText : colorHex(project.color),
      },
      tooltip: "Project",
    });
  }

  const keywords = [
    `p${task.priority}`,
    ...task.labels,
    ...(project && !project.is_inbox ? [project.name] : []),
  ].flatMap((keyword) => keyword.split(" "));

  return (
    <List.Item
      key={task.id}
      title={task.content}
      subtitle={subtitle}
      icon={task.completed_at ? { source: Icon.CheckCircle, tintColor: Color.Green } : getPriorityIcon(task)}
      accessories={accessories}
      keywords={keywords}
      actions={
        <ActionPanel title={task.content}>
          <TaskActions task={task} today={today} mutate={mutate} projects={projects} />
        </ActionPanel>
      }
    />
  );
}
