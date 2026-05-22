import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  closeMainWindow,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactElement, useMemo, useState } from "react";
import {
  archiveTask,
  assertAppReady,
  deleteTask,
  getStatus,
  listProjects,
  listTags,
  listTasks,
  restoreTask,
  startTask,
  stopCurrentTask,
  updateTask,
} from "../lib/sp-client";
import { getErrorMessage } from "../lib/sp-errors";
import { ListTasksParams, SpProject, SpTag, SpTask } from "../lib/sp-models";
import { SetupEmptyView } from "../lib/ui";
import { CreateTaskForm } from "./CreateTaskForm";
import {
  formatDateValue,
  formatTaskTiming,
  shouldCloseWindowAfterDoneToggle,
  TODAY_TAG_ID,
} from "./task-format";
import { getTaskAccessories, getTaskIcon } from "./task-utils";

interface MutationOptions {
  closeWindow?: boolean;
}

interface TaskListViewProps {
  title: string;
  navigationTitle?: string;
  projectId?: string;
  tagId?: string;
  source?: ListTasksParams["source"];
  includeDoneDefault?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

interface TaskListData {
  tasks: SpTask[];
  currentTaskId: string | null;
  projects: SpProject[];
  tags: SpTag[];
  archivedIds: Set<string>;
}

const loadTaskData = async (filters: {
  projectId?: string;
  tagId?: string;
  includeDone: boolean;
  source: ListTasksParams["source"];
}): Promise<TaskListData> => {
  await assertAppReady();
  const listParams: ListTasksParams = {
    projectId: filters.projectId,
    tagId: filters.tagId,
    includeDone: filters.includeDone,
    source: filters.source,
  };

  const [tasks, status, projects, tags, archivedTasks] = await Promise.all([
    listTasks(listParams),
    getStatus(),
    listProjects(),
    listTags(),
    filters.source === "all"
      ? listTasks({
          projectId: filters.projectId,
          tagId: filters.tagId,
          includeDone: true,
          source: "archived",
        })
      : Promise.resolve([]),
  ]);

  return {
    tasks,
    currentTaskId: status.currentTaskId,
    projects,
    tags,
    archivedIds: new Set(
      filters.source === "archived"
        ? tasks.map((task) => task.id)
        : archivedTasks.map((task) => task.id),
    ),
  };
};

const compactDate = (value?: string | number | null): string | null => {
  const date = formatDateValue(value);
  return date ? date.toLocaleString() : null;
};

const taskMarkdown = (
  task: SpTask,
  currentTaskId: string | null,
  projectById: Map<string, SpProject>,
  tagById: Map<string, SpTag>,
  isArchived: boolean,
): string => {
  const timing = formatTaskTiming(task);
  const project = task.projectId
    ? projectById.get(task.projectId)?.title
    : null;
  const tags = task.tagIds.map((id) => tagById.get(id)?.title ?? id);
  const lines = [
    `# ${task.title}`,
    "",
    task.notes?.trim() || "_No notes_",
    "",
    "## Indicators",
    "",
    `- State: ${isArchived ? "Archived" : task.isDone ? "Done" : "Active"}`,
    `- Current: ${task.id === currentTaskId ? "Yes" : "No"}`,
    `- Project: ${project ?? "None"}`,
    `- Tags: ${tags.length ? tags.join(", ") : "None"}`,
    `- Parent: ${task.parentId ?? "None"}`,
    `- Subtasks: ${task.subTaskIds.length}`,
    `- Due: ${compactDate(task.dueWithTime ?? task.dueDay) ?? "None"}`,
    `- Planned: ${compactDate(task.plannedAt) ?? "None"}`,
    `- Estimate: ${timing.estimate ?? "None"}`,
    `- Time spent: ${timing.spent ?? "None"}`,
  ];

  return lines.join("\n");
};

interface TaskActionsProps {
  task: SpTask;
  currentTaskId: string | null;
  isArchived: boolean;
  onDelete: (task: SpTask) => Promise<void>;
  onMutate: (
    action: () => Promise<unknown>,
    title: string,
    options?: MutationOptions,
  ) => Promise<void>;
  onRefresh: () => void;
  showDoneToggle?: boolean;
  children?: ReactElement;
}

function TaskActions(props: TaskActionsProps): ReactElement {
  const { task, currentTaskId, isArchived } = props;

  return (
    <ActionPanel>
      {props.children}
      {!isArchived ? (
        <>
          {task.id === currentTaskId ? (
            <Action
              title="Stop Current Task"
              icon={{ source: Icon.Stop, tintColor: Color.Red }}
              onAction={() =>
                props.onMutate(() => stopCurrentTask(), "Current task stopped")
              }
            />
          ) : (
            <Action
              title="Start Task"
              icon={{ source: Icon.Play, tintColor: Color.Green }}
              onAction={() =>
                props.onMutate(() => startTask(task.id), "Task started")
              }
            />
          )}
          {props.showDoneToggle !== false ? (
            <Action
              title={task.isDone ? "Mark as Active" : "Mark as Completed"}
              icon={task.isDone ? Icon.Circle : Icon.CheckCircle}
              onAction={() =>
                props.onMutate(
                  () => updateTask(task.id, { isDone: !task.isDone }),
                  task.isDone ? "Task marked active" : "Task marked completed",
                  {
                    closeWindow: shouldCloseWindowAfterDoneToggle(task.isDone),
                  },
                )
              }
            />
          ) : null}
          {!task.parentId ? (
            <Action.Push
              title="Create Subtask"
              icon={Icon.PlusCircle}
              target={
                <CreateTaskForm
                  initialMode="subtask"
                  initialParentId={task.id}
                  initialParentTitle={task.title}
                  navigationTitle="Create Subtask"
                />
              }
            />
          ) : null}
          <Action
            title="Archive Task"
            icon={Icon.Archive}
            onAction={() =>
              props.onMutate(() => archiveTask(task.id), "Task archived")
            }
          />
        </>
      ) : (
        <Action
          title="Restore Task"
          icon={Icon.ArrowCounterClockwise}
          onAction={() =>
            props.onMutate(() => restoreTask(task.id), "Task restored")
          }
        />
      )}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={props.onRefresh}
      />
      <Action
        title="Delete Task"
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        style={Action.Style.Destructive}
        onAction={() => props.onDelete(task)}
      />
    </ActionPanel>
  );
}

export function TaskDetailView(props: {
  task: SpTask;
  currentTaskId: string | null;
  projectById: Map<string, SpProject>;
  tagById: Map<string, SpTag>;
  isArchived: boolean;
  onDelete: (task: SpTask) => Promise<void>;
  onMutate: (
    action: () => Promise<unknown>,
    title: string,
    options?: MutationOptions,
  ) => Promise<void>;
  onRefresh: () => void;
}): ReactElement {
  return (
    <Detail
      navigationTitle={props.task.title}
      markdown={taskMarkdown(
        props.task,
        props.currentTaskId,
        props.projectById,
        props.tagById,
        props.isArchived,
      )}
      actions={
        <TaskActions
          task={props.task}
          currentTaskId={props.currentTaskId}
          isArchived={props.isArchived}
          onDelete={props.onDelete}
          onMutate={props.onMutate}
          onRefresh={props.onRefresh}
        />
      }
    />
  );
}

export function TaskListView(props: TaskListViewProps): ReactElement {
  const source = props.source ?? "active";
  const [includeDone, setIncludeDone] = useState(
    props.includeDoneDefault ?? source !== "active",
  );
  const { data, error, isLoading, revalidate } = usePromise(loadTaskData, [
    {
      projectId: props.projectId,
      tagId: props.tagId,
      includeDone,
      source,
    },
  ]);

  const projectById = useMemo(
    () =>
      new Map((data?.projects ?? []).map((project) => [project.id, project])),
    [data?.projects],
  );
  const tagById = useMemo(
    () => new Map((data?.tags ?? []).map((tag) => [tag.id, tag])),
    [data?.tags],
  );

  const runMutation = async (
    action: () => Promise<unknown>,
    title: string,
    options: MutationOptions = {},
  ) => {
    try {
      await action();
      await showToast({ style: Toast.Style.Success, title });
      await revalidate();
      if (options.closeWindow) {
        await closeMainWindow({ clearRootSearch: true });
      }
    } catch (mutationError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Action failed",
        message: getErrorMessage(mutationError),
      });
      await revalidate();
    }
  };

  const handleDelete = async (task: SpTask) => {
    const confirmed = await confirmAlert({
      title: `Delete "${task.title}"?`,
      message: "This permanently deletes the task in Super Productivity.",
      primaryAction: {
        title: "Delete Task",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    await runMutation(() => deleteTask(task.id), "Task deleted");
  };

  const emptyDescription =
    props.emptyDescription ??
    (includeDone
      ? "No tasks matched this view."
      : "No active tasks matched this view.");

  return (
    <List
      isLoading={isLoading}
      navigationTitle={props.navigationTitle}
      searchBarPlaceholder="Filter tasks by title"
      isShowingDetail={false}
    >
      {error ? (
        <SetupEmptyView error={error} />
      ) : (
        (data?.tasks ?? []).map((task) => {
          const isArchived = data?.archivedIds.has(task.id) ?? false;
          return (
            <List.Item
              key={task.id}
              icon={getTaskIcon(task, data?.currentTaskId ?? null)}
              title={task.title}
              subtitle={
                task.notes ? task.notes.replace(/\s+/g, " ").trim() : undefined
              }
              accessories={getTaskAccessories(
                task,
                data?.currentTaskId ?? null,
                projectById,
                tagById,
                { archived: isArchived },
              )}
              actions={
                <TaskActions
                  task={task}
                  currentTaskId={data?.currentTaskId ?? null}
                  isArchived={isArchived}
                  onDelete={handleDelete}
                  onMutate={runMutation}
                  onRefresh={revalidate}
                >
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Sidebar}
                    target={
                      <TaskDetailView
                        task={task}
                        currentTaskId={data?.currentTaskId ?? null}
                        projectById={projectById}
                        tagById={tagById}
                        isArchived={isArchived}
                        onDelete={handleDelete}
                        onMutate={runMutation}
                        onRefresh={revalidate}
                      />
                    }
                  />
                </TaskActions>
              }
            />
          );
        })
      )}
      {!error && !isLoading && (data?.tasks?.length ?? 0) === 0 ? (
        <List.EmptyView
          icon={source === "archived" ? Icon.Archive : Icon.List}
          title={props.emptyTitle ?? "No Tasks Found"}
          description={emptyDescription}
        />
      ) : null}
      {!error && source === "active" && props.tagId !== TODAY_TAG_ID ? (
        <List.Item
          icon={includeDone ? Icon.EyeDisabled : Icon.Eye}
          title={includeDone ? "Hide Completed Tasks" : "Show Completed Tasks"}
          actions={
            <ActionPanel>
              <Action
                title={
                  includeDone ? "Hide Completed Tasks" : "Show Completed Tasks"
                }
                icon={includeDone ? Icon.EyeDisabled : Icon.Eye}
                onAction={() => setIncludeDone((current) => !current)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
