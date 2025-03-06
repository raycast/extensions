import { Color, Detail, environment, Icon } from "@raycast/api";
import { differenceInCalendarDays, format } from "date-fns";

import { getTask } from "@/api/task";
import ActionsTask from "@/components/ActionsTask";
import useFieldTemplates from "@/hooks/useFieldTemplates";
import useLists from "@/hooks/useLists";
import useTask from "@/hooks/useTask";
import useTasks from "@/hooks/useTasks";
import useUsers from "@/hooks/useUsers";
import useWorkspace from "@/hooks/useWorkspace";
import { TaskObject } from "@/types/task";
import { CachedPromiseMutateType } from "@/types/utils";
import { getListById, getTintColorFromHue, ListColors } from "@/utils/list";
import { getAssigneeById, getIconByStatusState, getPriorityIcon, getStatusById } from "@/utils/task";

type Props = {
  taskId: string;
  mutateTask: CachedPromiseMutateType<typeof getTask>;
};

const markdown = (task: TaskObject | undefined) => `
# ${task?.name}

${task?.description}
`;

export default function DetailsTask({ taskId, mutateTask }: Props) {
  const { appearance } = environment;
  const {
    fieldTemplatesStatuses,
    fieldTemplatesPrioritiesObj,
    fieldTemplatesPriorities,
    fieldTemplatesDueDate,
    fieldTemplatesIsLoading,
  } = useFieldTemplates();
  const { tasks, tasksIsLoading } = useTasks();
  const { task, taskIsLoading, taskRevalidate } = useTask({ taskId });
  const { lists, smartLists, listsIsLoading } = useLists();
  const { users, usersIsLoading } = useUsers();
  const { workspaceData, workspaceIsLoading } = useWorkspace();

  const status = getStatusById(task?.status, fieldTemplatesStatuses);

  const priority = task?.fields?.find((field) => field?.name?.toLowerCase() === "priority");

  const today = new Date();
  const dueDate = task?.fields?.find((field) => field?.name?.toLowerCase() === "due date");

  if (!task) return <Detail />;

  return (
    <Detail
      isLoading={
        taskIsLoading ||
        tasksIsLoading ||
        fieldTemplatesIsLoading ||
        listsIsLoading ||
        usersIsLoading ||
        workspaceIsLoading
      }
      markdown={markdown(task)}
      navigationTitle={task?.name}
      actions={
        <ActionsTask
          task={task}
          mutateTask={mutateTask}
          fieldTemplatesStatuses={fieldTemplatesStatuses}
          fieldTemplatesPriorities={fieldTemplatesPriorities}
          fieldTemplatesPrioritiesObj={fieldTemplatesPrioritiesObj}
          fieldTemplatesDueDate={fieldTemplatesDueDate}
          lists={lists}
          tasks={tasks}
          users={users}
          workspace={workspaceData}
          detailsTaskRevalidate={taskRevalidate}
          detailsPage
        />
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={status?.value}
            icon={{
              source: getIconByStatusState(task?.status, fieldTemplatesStatuses),
              tintColor: `hsl(${status?.hue ?? "0"}, 80%, ${
                typeof status?.hue === "number" ? "60%" : appearance === "dark" ? "100%" : "0"
              })`,
            }}
          />

          {priority?.selectValue ? (
            <Detail.Metadata.Label
              title="Priority"
              text={priority.selectValue.value}
              icon={{
                source: getPriorityIcon(priority.selectValue.value),
                tintColor: `hsl(${priority.selectValue.hue ?? "0"}, 80%, ${
                  typeof priority.selectValue.hue === "number" ? "60%" : appearance === "dark" ? "100%" : "0"
                })`,
              }}
            />
          ) : null}

          {dueDate?.date ? (
            <Detail.Metadata.Label
              title="Due Date"
              text={format(new Date(dueDate.date), "MMM dd")}
              icon={{
                source: Icon.Calendar,
                tintColor:
                  differenceInCalendarDays(new Date(dueDate.date), today) <= 0 && !task.completed
                    ? Color.Red
                    : differenceInCalendarDays(new Date(dueDate.date), today) <= 2 && !task.completed
                      ? Color.Yellow
                      : Color.PrimaryText,
              }}
            />
          ) : null}

          {task.assigneesIds.length > 0 ? (
            <Detail.Metadata.TagList title="Assignees">
              {task.assigneesIds.map((assigneeId) => {
                const assignee = getAssigneeById(assigneeId, users);
                if (!assignee) return null;

                return (
                  <Detail.Metadata.TagList.Item
                    key={assignee.id}
                    text={`${assignee.firstname} ${assignee.lastname}`}
                    color={`hsl(${assignee?.hue ?? "0"}, 80%, ${
                      typeof assignee?.hue === "number" ? "60%" : appearance === "dark" ? "100%" : "0"
                    })`}
                    icon={{
                      source: assignee?.pictureUrl ?? Icon.Person,
                      tintColor: assignee?.pictureUrl
                        ? undefined
                        : `hsl(${assignee?.hue ?? "0"}, 80%, ${
                            typeof assignee?.hue === "number" ? "60%" : appearance === "dark" ? "100%" : "0"
                          })`,
                    }}
                  />
                );
              })}
            </Detail.Metadata.TagList>
          ) : null}

          {task.listIds.length > 0 ? (
            <Detail.Metadata.TagList title="Lists">
              {task.listIds.map((listId) => {
                const list = getListById(listId, lists, smartLists);
                if (!list) return null;
                return (
                  <Detail.Metadata.TagList.Item
                    key={list.id}
                    text={list.name}
                    color={getTintColorFromHue(list?.appearance?.hue, ListColors)}
                    icon={{
                      source: list.appearance?.iconUrl ?? "list-icons/list.svg",
                      tintColor: getTintColorFromHue(list?.appearance?.hue, ListColors),
                    }}
                  />
                );
              })}
            </Detail.Metadata.TagList>
          ) : null}

          <Detail.Metadata.Separator />

          {task?.parentTaskId ? (
            <Detail.Metadata.Label
              title="Parent Task"
              text={task?.parentTasks[0]?.name}
              icon={{
                source:
                  getListById(task?.parentTasks[0]?.listIds[0], lists, smartLists)?.appearance?.iconUrl ??
                  "list-icons/list.svg",
                tintColor: getTintColorFromHue(task.lists?.[0]?.appearance?.hue, ListColors),
              }}
            />
          ) : null}

          <Detail.Metadata.Label title="Task ID" text={task.url.split("/").at(-1)} />

          <Detail.Metadata.Label title="Created At" text={format(new Date(task.createdAt), "MMM dd yyyy")} />
        </Detail.Metadata>
      }
    />
  );
}
