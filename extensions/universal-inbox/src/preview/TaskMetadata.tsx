import { Task, TaskPriority, TaskStatus } from "../task";
import { Color, Detail } from "@raycast/api";
import { formatDate } from "../utils";

const PRIORITY_COLOR: Record<TaskPriority, Color> = {
  [TaskPriority.P1]: Color.Red,
  [TaskPriority.P2]: Color.Orange,
  [TaskPriority.P3]: Color.Yellow,
  [TaskPriority.P4]: Color.SecondaryText,
};

/** Metadata sidebar shared by the Todoist and TickTick task previews. */
export function TaskMetadata({ task }: { task: Task }) {
  const due = task.due_at?.content ? formatDate(task.due_at.content) : undefined;

  return (
    <>
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item
          text={task.status}
          color={task.status === TaskStatus.Done ? Color.Green : Color.Blue}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.TagList title="Priority">
        <Detail.Metadata.TagList.Item text={`P${task.priority}`} color={PRIORITY_COLOR[task.priority]} />
      </Detail.Metadata.TagList>
      {due ? <Detail.Metadata.Label title="Due" text={due} /> : null}
      {task.project ? <Detail.Metadata.Label title="Project" text={task.project} /> : null}
      {task.tags.length > 0 ? (
        <Detail.Metadata.TagList title="Tags">
          {task.tags.map((tag) => (
            <Detail.Metadata.TagList.Item key={tag} text={tag} />
          ))}
        </Detail.Metadata.TagList>
      ) : null}
    </>
  );
}
