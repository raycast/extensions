import { ActionPanel, Color, Detail, Icon, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Task, getTask } from "../api";
import { colorHex } from "../helpers/colors";
import { displayDate, displayTime } from "../helpers/dates";
import { priorities } from "../helpers/priorities";
import { useProjects, useUserSettings } from "../hooks/useData";
import TaskActions from "./TaskActions";

type TaskDetailProps = {
  task: Task;
  today: string;
  mutate: () => Promise<unknown>;
};

export default function TaskDetail({ task: initialTask, today, mutate }: TaskDetailProps) {
  const { pop } = useNavigation();
  const { data: projects } = useProjects();
  const { data: settings } = useUserSettings();

  // Fetch the task itself so the detail stays live regardless of which list
  // (or cache) it was opened from. Errors are swallowed: after a delete the
  // task is gone and this view pops anyway.
  const {
    data: freshTask,
    isLoading,
    mutate: mutateTask,
  } = useCachedPromise((id: string) => getTask(id), [initialTask.id], {
    keepPreviousData: true,
    onError: () => {},
  });

  const task = freshTask ?? initialTask;

  async function mutateAll() {
    await Promise.allSettled([mutate(), mutateTask()]);
  }
  const project = projects?.find((p) => p.id === task.project_id);
  const priority = priorities.find((p) => p.value === task.priority);

  const markdown = `# ${task.content}${task.description ? `\n\n${task.description}` : ""}`;

  return (
    <Detail
      navigationTitle={task.content}
      markdown={markdown}
      isLoading={isLoading}
      metadata={
        <Detail.Metadata>
          {task.due ? (
            <Detail.Metadata.Label
              title="Due"
              icon={task.due.is_recurring ? Icon.ArrowClockwise : Icon.Calendar}
              text={`${displayDate(task.due.date, today)}${task.due.time ? ` ${displayTime(task.due.time, settings?.timeFormat)}` : ""}${task.due.is_recurring ? " (recurring)" : ""}`}
            />
          ) : null}
          {task.deadline_date ? (
            <Detail.Metadata.Label
              title="Deadline"
              icon={Icon.BullsEye}
              text={`${displayDate(task.deadline_date, today)}${task.deadline_time ? ` ${displayTime(task.deadline_time, settings?.timeFormat)}` : ""}`}
            />
          ) : null}
          {priority ? (
            <Detail.Metadata.TagList title="Priority">
              <Detail.Metadata.TagList.Item text={priority.name} color={priority.color} />
            </Detail.Metadata.TagList>
          ) : null}
          {project ? (
            <Detail.Metadata.TagList title="Project">
              <Detail.Metadata.TagList.Item
                text={project.is_inbox ? "Inbox" : project.name}
                color={colorHex(project.color)}
              />
            </Detail.Metadata.TagList>
          ) : null}
          {task.labels.length > 0 ? (
            <Detail.Metadata.TagList title="Labels">
              {task.labels.map((label) => (
                <Detail.Metadata.TagList.Item key={label} text={label} color={Color.SecondaryText} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created" text={new Date(task.created_at).toLocaleDateString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <TaskActions task={task} projects={projects} today={today} mutate={mutateAll} isDetail onDeleted={pop} />
        </ActionPanel>
      }
    />
  );
}
