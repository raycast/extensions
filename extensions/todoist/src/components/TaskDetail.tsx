import { ActionPanel, Detail, Icon } from "@raycast/api";
import { Task, colors } from "@doist/todoist-api-typescript";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { format } from "date-fns";
import { displayDueDate } from "../helpers/dates";
import { priorities } from "../constants";
import { todoist, handleError } from "../api";
import TaskActions from "./TaskActions";

interface TaskDetailProps {
  taskId: Task["id"];
  mutateTasks?: MutatePromise<Task[] | undefined>;
}

export default function TaskDetail({ taskId, mutateTasks }: TaskDetailProps): JSX.Element {
  const {
    data: task,
    isLoading: isLoadingTask,
    error: getTaskError,
    mutate: mutateTaskDetail,
  } = useCachedPromise((taskId) => todoist.getTask(taskId), [taskId]);
  const {
    data: projects,
    isLoading: isLoadingProjects,
    error: getProjectsError,
  } = useCachedPromise(() => todoist.getProjects());
  const {
    data: labels,
    isLoading: isLoadingLabels,
    error: getLabelsError,
  } = useCachedPromise(() => todoist.getLabels());
  const {
    data: comments,
    isLoading: isLoadingComments,
    error: getCommentsError,
    mutate: mutateComments,
  } = useCachedPromise((taskId) => todoist.getComments({ taskId }), [task?.id], { execute: !!task?.id });

  if (getTaskError) {
    handleError({ error: getTaskError, title: "Unable to get task detail" });
  }

  if (getProjectsError) {
    handleError({ error: getProjectsError, title: "Unable to get projects" });
  }

  if (getLabelsError) {
    handleError({ error: getLabelsError, title: "Unable to get labels" });
  }

  if (getCommentsError) {
    handleError({ error: getCommentsError, title: "Unable to get comments" });
  }

  const priority = priorities.find((priority) => priority.value === task?.priority);
  const project = projects?.find((project) => project.id === task?.projectId);
  const taskLabels = task?.labels.map((labelName) => {
    const associatedLabel = labels?.find((label) => label.name === labelName);

    return {
      ...associatedLabel,
      color: colors.find((color) => color.key === associatedLabel?.color),
    };
  });
  const hasComments = comments && comments.length > 0;

  let displayedDate = "No due date";
  if (task?.due) {
    const dueDate = displayDueDate(task.due.date);

    displayedDate = task.due.datetime ? `${dueDate} ${format(new Date(task.due.datetime), "HH:mm")}` : dueDate;
  }

  return (
    <Detail
      isLoading={isLoadingTask || isLoadingProjects || isLoadingLabels || isLoadingComments}
      navigationTitle={task?.content}
      {...(task
        ? {
            markdown: `# ${task?.content}\n\n${task?.description}`,
            metadata: (
              <Detail.Metadata>
                <Detail.Metadata.Label
                  title="Project"
                  text={project?.name}
                  icon={project?.isInboxProject ? Icon.Envelope : Icon.List}
                />

                <Detail.Metadata.Label title="Due Date" text={displayedDate} icon={Icon.Calendar} />

                {priority ? (
                  <Detail.Metadata.Label
                    title="Priority"
                    text={priority.name}
                    icon={{ source: priority.icon, tintColor: priority?.color }}
                  />
                ) : null}

                {taskLabels && taskLabels.length > 0 ? (
                  <Detail.Metadata.TagList title="Labels">
                    {taskLabels.map((taskLabel, index) => (
                      <Detail.Metadata.TagList.Item
                        key={taskLabel?.id || index}
                        text={taskLabel?.name || ""}
                        color={taskLabel.color?.hexValue}
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
            ),
            actions: (
              <ActionPanel>
                <TaskActions
                  task={task}
                  fromDetail={true}
                  mutateTasks={mutateTasks}
                  mutateTaskDetail={mutateTaskDetail}
                  mutateComments={mutateComments}
                />
              </ActionPanel>
            ),
          }
        : {})}
    />
  );
}
