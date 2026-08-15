import { Color, Detail, Icon } from "@raycast/api";
import { Project, Task } from "../api";
import { formatDueDate, dueDateColor } from "../helpers/dates";
import { PRIORITY_MAP, PRIORITY_COLORS } from "../helpers/priorities";
import { TaskActions } from "./task-list-item";

export function TaskDetail({
  task,
  baseUrl,
  projects,
  onToggleDone,
  onDelete,
  onRefresh,
}: {
  task: Task;
  baseUrl: string;
  projects: Project[];
  onToggleDone: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRefresh: () => void;
}) {
  const project = projects.find((p) => p.id === task.project_id);
  const dueText = formatDueDate(task.due_date);
  const dueColor = dueDateColor(task.due_date);

  const markdown = task.description
    ? `# ${task.title}\n\n${task.description}`
    : `# ${task.title}\n\n*No description*`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={task.done ? "Done" : "Open"}
            icon={
              task.done
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.Circle, tintColor: Color.Blue }
            }
          />
          {project && (
            <Detail.Metadata.Label
              title="Project"
              text={project.title}
              icon={
                project.hex_color
                  ? {
                      source: Icon.CircleFilled,
                      tintColor: project.hex_color as Color,
                    }
                  : Icon.List
              }
            />
          )}
          {task.priority > 0 && (
            <Detail.Metadata.TagList title="Priority">
              <Detail.Metadata.TagList.Item
                text={PRIORITY_MAP[task.priority] ?? `P${task.priority}`}
                color={PRIORITY_COLORS[task.priority]}
              />
            </Detail.Metadata.TagList>
          )}
          {dueText && (
            <Detail.Metadata.Label
              title="Due Date"
              text={dueText}
              icon={
                dueColor
                  ? { source: Icon.Calendar, tintColor: dueColor }
                  : Icon.Calendar
              }
            />
          )}
          {task.is_favorite && (
            <Detail.Metadata.Label
              title="Favorite"
              icon={{ source: Icon.Star, tintColor: Color.Yellow }}
              text="Yes"
            />
          )}
          {task.labels?.length > 0 && (
            <Detail.Metadata.TagList title="Labels">
              {task.labels.map((label) => (
                <Detail.Metadata.TagList.Item
                  key={label.id}
                  text={label.title}
                  color={label.hex_color as Color}
                />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Created"
            text={new Date(task.created).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          />
          <Detail.Metadata.Label
            title="Updated"
            text={new Date(task.updated).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          />
          <Detail.Metadata.Link
            title="Open in Browser"
            text="Vikunja"
            target={`${baseUrl}/tasks/${task.id}`}
          />
        </Detail.Metadata>
      }
      actions={
        <TaskActions
          task={task}
          baseUrl={baseUrl}
          projects={projects}
          onToggleDone={onToggleDone}
          onDelete={onDelete}
          onRefresh={onRefresh}
        />
      }
    />
  );
}
