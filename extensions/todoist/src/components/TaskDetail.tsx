import { ActionPanel, Detail, Icon, Color } from "@raycast/api";
import { format } from "date-fns";

import { Task } from "../api";
import { getCollaboratorIcon } from "../helpers/collaborators";
import { displayDate, isExactTimeTask } from "../helpers/dates";
import { getTaskLabels } from "../helpers/labels";
import { priorities } from "../helpers/priorities";
import { getProjectIcon } from "../helpers/projects";
import { displayReminderName } from "../helpers/reminders";
import useCachedData from "../hooks/useCachedData";

import TaskActions from "./TaskActions";

type TaskDetailProps = {
  taskId: Task["id"];
};

export default function TaskDetail({ taskId }: TaskDetailProps) {
  const [data, setData] = useCachedData();

  const task = data?.items.find((task) => task.id === taskId);
  const comments = data?.notes.filter((comment) => comment.item_id === taskId);
  const commentsWithFiles = comments?.filter((comment) => !!comment.file_attachment);
  const assignee = data?.collaborators.find((collaborator) => task?.responsible_uid === collaborator.id);
  const assignedBy = data?.collaborators.find((collaborator) => task?.assigned_by_uid === collaborator.id);

  const priority = priorities.find((priority) => priority.value === task?.priority);
  const project = data?.projects.find((project) => project.id === task?.project_id);
  const section = data?.sections.find((section) => section.id === task?.section_id);
  const taskLabels = task && data?.labels ? getTaskLabels(task, data.labels) : [];
  const hasComments = comments && comments.length > 0;
  const subTasks = data?.items.filter((item) => item.parent_id === taskId);

  let displayedDate = "No date";
  let displayedDeadline = "No deadline";

  if (task?.due) {
    const date = displayDate(task.due.date);

    displayedDate = isExactTimeTask(task) ? `${date} ${format(new Date(task.due.date), "HH:mm")}` : date;
  }

  if (task?.deadline) {
    const deadlineDate = displayDate(task.deadline.date);

    displayedDeadline = deadlineDate;
  }

  const reminders =
    data?.reminders.filter((r) => {
      if (r.is_deleted === 1) return false;

      return r.item_id === taskId;
    }) ?? [];

  const use12HourFormat = data?.user?.time_format === 1;

  return (
    <Detail
      navigationTitle={task?.content}
      {...(task
        ? {
            markdown: `# ${task?.content}\n\n${task?.description}`,
            metadata: (
              <Detail.Metadata>
                {project ? (
                  <Detail.Metadata.Label
                    title="Project"
                    text={`${project.name}${section ? ` / ${section.name}` : ""}`}
                    icon={getProjectIcon(project)}
                  />
                ) : null}

                {assignee ? (
                  <Detail.Metadata.Label
                    title="Assignee"
                    text={assignee.full_name}
                    icon={getCollaboratorIcon(assignee)}
                  />
                ) : null}

                <Detail.Metadata.Label title="Date" text={displayedDate} icon={Icon.Calendar} />
                <Detail.Metadata.Label title="Deadline" text={displayedDeadline} icon={Icon.BullsEye} />

                {subTasks && subTasks?.length > 0 ? (
                  <Detail.Metadata.Label
                    title={"Sub-tasks"}
                    text={`${subTasks.length} subtask${subTasks.length > 1 ? "s" : ""}`}
                    icon={{ source: "sub-task.svg", tintColor: Color.PrimaryText }}
                  />
                ) : null}

                {priority ? (
                  <Detail.Metadata.Label
                    title="Priority"
                    text={priority.name}
                    icon={{ source: priority.icon, tintColor: priority?.color }}
                  />
                ) : null}

                {taskLabels && taskLabels.length > 0 ? (
                  <Detail.Metadata.TagList title="Labels">
                    {taskLabels.map((taskLabel) => {
                      return (
                        <Detail.Metadata.TagList.Item
                          key={taskLabel.id}
                          text={taskLabel.name}
                          color={taskLabel.color}
                        />
                      );
                    })}
                  </Detail.Metadata.TagList>
                ) : null}

                {reminders.length > 0 ? (
                  <Detail.Metadata.TagList title="Reminders">
                    {reminders.map((reminder) => {
                      return (
                        <Detail.Metadata.TagList.Item
                          key={reminder.id}
                          text={displayReminderName(reminder, use12HourFormat)}
                        />
                      );
                    })}
                  </Detail.Metadata.TagList>
                ) : null}

                {hasComments || assignedBy ? <Detail.Metadata.Separator /> : null}

                {hasComments ? (
                  <Detail.Metadata.Label
                    title="Comments"
                    text={`${comments.length} ${comments.length === 1 ? "comment" : "comments"}${
                      commentsWithFiles && commentsWithFiles.length > 0
                        ? ` (${commentsWithFiles.length} with file)`
                        : ""
                    }`}
                    icon={Icon.Bubble}
                  />
                ) : null}

                {assignedBy ? (
                  <Detail.Metadata.Label
                    title="Assigned by"
                    text={assignedBy.full_name}
                    icon={getCollaboratorIcon(assignedBy)}
                  />
                ) : null}
              </Detail.Metadata>
            ),
            actions: (
              <ActionPanel>
                <TaskActions task={task} fromDetail={true} data={data} setData={setData} />
              </ActionPanel>
            ),
          }
        : {})}
    />
  );
}
