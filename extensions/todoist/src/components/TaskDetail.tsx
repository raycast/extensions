import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { Task, colors } from "@doist/todoist-api-typescript";
import useSWR from "swr";
import { format } from "date-fns";
import { displayDueDate } from "../helpers";
import { priorities } from "../constants";
import { SWRKeys } from "../types";
import { todoist, handleError } from "../api";
import TaskComments from "./TaskComments";
import TaskCommentForm from "./TaskCommentForm";

interface TaskDetailProps {
  task: Task;
}

export default function TaskDetail({ task }: TaskDetailProps): JSX.Element {
  const { data: projects, error: getProjectsError } = useSWR(SWRKeys.projects, () => todoist.getProjects());
  const { data: labels, error: getLabelsError } = useSWR(SWRKeys.labels, () => todoist.getLabels());
  const { data: comments, error: getCommentsError } = useSWR(SWRKeys.comments, () =>
    todoist.getComments({ taskId: task.id })
  );

  if (getProjectsError) {
    handleError({ error: getProjectsError, title: "Unable to get tasks" });
  }

  if (getLabelsError) {
    handleError({ error: getLabelsError, title: "Unable to get labels" });
  }

  if (getCommentsError) {
    handleError({ error: getCommentsError, title: "Unable to get comments" });
  }

  const priority = priorities.find((priority) => priority.value === task.priority);
  const project = projects?.find((project) => project.id === task.projectId);
  const taskLabels = task.labelIds.map((labelId) => {
    const associatedLabel = labels?.find((label) => label.id === labelId);
    return {
      ...associatedLabel,
      color: colors.find((color) => color.id === associatedLabel?.color),
    };
  });
  const hasComments = comments && comments.length > 0;

  let displayedDate = "No due date";
  if (task.due) {
    const dueDate = displayDueDate(task.due.date);

    displayedDate = task.due.datetime ? `${dueDate} ${format(new Date(task.due.datetime), "HH:mm")}` : dueDate;
  }

  return (
    <Detail
      markdown={`# ${task.content}\n\n${task.description}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Project"
            text={project?.name}
            icon={project?.inboxProject ? Icon.Envelope : Icon.List}
          />

          <Detail.Metadata.Label title="Due Date" text={displayedDate} icon={Icon.Calendar} />

          <Detail.Metadata.Label
            title="Priority"
            text={priority?.name}
            icon={{ source: Icon.LevelMeter, tintColor: priority?.color }}
          />
          {taskLabels && taskLabels.length > 0 ? (
            <Detail.Metadata.TagList title="Labels">
              {taskLabels.map((taskLabel, index) => (
                <Detail.Metadata.TagList.Item
                  key={taskLabel?.id || index}
                  text={taskLabel?.name || ""}
                  color={taskLabel.color?.value}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : null}

          {hasComments ? (
            <Detail.Metadata.Label
              title="Comments"
              text={`${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}
              icon={Icon.Bubble}
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={task.url} />

          <Action.Push title="Add New Comment" icon={Icon.Plus} target={<TaskCommentForm task={task} />} />

          {hasComments ? (
            <Action.Push
              title="Show Comments"
              icon={Icon.Bubble}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              target={<TaskComments task={task} />}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
