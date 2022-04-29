import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { Task, colors } from "@doist/todoist-api-typescript";
import useSWR from "swr";
import { format } from "date-fns";
import { displayDueDate } from "../helpers";
import { priorities } from "../constants";
import { SWRKeys } from "../types";
import { todoist, handleError } from "../api";

interface TaskDetailProps {
  task: Task;
}

export default function TaskDetail({ task }: TaskDetailProps): JSX.Element {
  const { data: projects, error: getProjectsError } = useSWR(SWRKeys.projects, () => todoist.getProjects());
  const { data: labels, error: getLabelsError } = useSWR(SWRKeys.labels, () => todoist.getLabels());

  if (getProjectsError) {
    handleError({ error: getProjectsError, title: "Unable to get tasks" });
  }

  if (getLabelsError) {
    handleError({ error: getLabelsError, title: "Unable to get labels" });
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
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={task.url} />
        </ActionPanel>
      }
    />
  );
}
