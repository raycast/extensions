import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";

import { getWebBaseUrl } from "./api/client";
import {
  getCurrentUser,
  getProjects,
  getServiceInfo,
  getTasks,
} from "./api/vikunja";
import { CreateTaskFormScreen } from "./components/CreateTaskFormScreen";
import { TaskListItem } from "./components/TaskListItem";
import { VikunjaErrorView } from "./components/VikunjaErrorView";
import { isDueTodayOrOverdue } from "./lib/date";
import { showVikunjaErrorToast } from "./lib/errors";
import { isAssignedToUser } from "./lib/tasks";
import type { Project, Task, TaskListOptions } from "./types/vikunja";

type TaskSortPresetId = "due-date" | "priority" | "recently-updated" | "title";
type TaskViewId = "all" | "assigned" | "today" | `project:${number}`;

const TASK_SORT_PRESETS: Record<
  TaskSortPresetId,
  {
    icon: Icon;
    options: TaskListOptions;
    title: string;
  }
> = {
  "due-date": {
    icon: Icon.Calendar,
    options: { orderBy: "asc", sortBy: ["due_date", "priority", "id"] },
    title: "Due Date First",
  },
  priority: {
    icon: Icon.BarChart,
    options: { orderBy: "desc", sortBy: ["priority", "due_date", "id"] },
    title: "Highest Priority First",
  },
  "recently-updated": {
    icon: Icon.Clock,
    options: { orderBy: "desc", sortBy: ["updated", "id"] },
    title: "Recently Updated",
  },
  title: {
    icon: Icon.List,
    options: { orderBy: "asc", sortBy: ["title", "id"] },
    title: "Title A-Z",
  },
};

function getProjectViewId(projectId: number) {
  return `project:${projectId}` as const;
}

function getProjectIdFromViewId(viewId: TaskViewId) {
  if (!viewId.startsWith("project:")) {
    return undefined;
  }

  const projectId = Number(viewId.slice("project:".length));
  return Number.isInteger(projectId) && projectId > 0 ? projectId : undefined;
}

function getFallbackViewId(): TaskViewId {
  return "assigned";
}

function buildTaskUrl(frontendUrl: string, taskId?: number) {
  if (!taskId) {
    return undefined;
  }

  const normalizedFrontendUrl = frontendUrl.trim().replace(/\/+$/, "");

  if (!normalizedFrontendUrl) {
    return undefined;
  }

  return `${normalizedFrontendUrl}/tasks/${taskId}`;
}

function isValidViewId(viewId: TaskViewId, options: { projects?: Project[] }) {
  if (viewId === "all" || viewId === "assigned" || viewId === "today") {
    return true;
  }

  const projectId = getProjectIdFromViewId(viewId);
  return (
    projectId !== undefined &&
    (options.projects ?? []).some((project) => project.id === projectId)
  );
}

function matchesView(
  task: Task,
  viewId: TaskViewId,
  options: { timeZone?: string; userId?: number },
) {
  if (viewId === "all") {
    return true;
  }

  if (viewId === "assigned") {
    return isAssignedToUser(task, options.userId);
  }

  if (viewId === "today") {
    return isDueTodayOrOverdue(task, options.timeZone);
  }

  const projectId = getProjectIdFromViewId(viewId);
  return projectId !== undefined && task.project_id === projectId;
}

function getViewDetails(
  viewId: TaskViewId,
  options: { activeProject?: Project },
) {
  if (viewId === "all") {
    return {
      emptyDescription: "No tasks matched this search in the overview.",
      emptyTitle: "No tasks found",
      navigationTitle: "Tasks",
      placeholder: "Search all tasks...",
      sectionTitle: "Overview",
    };
  }

  if (viewId === "today") {
    return {
      emptyDescription: "No due-today or overdue tasks matched this search.",
      emptyTitle: "Nothing due today",
      navigationTitle: "Today",
      placeholder: "Search due and overdue tasks...",
      sectionTitle: "Due Today or Overdue",
    };
  }

  if (viewId === "assigned") {
    return {
      emptyDescription:
        "No tasks assigned to the current user matched this search.",
      emptyTitle: "No assigned tasks",
      navigationTitle: "Tasks",
      placeholder: "Search assigned tasks...",
      sectionTitle: "Assigned to Me",
    };
  }

  const title = options.activeProject?.title ?? "Project";

  return {
    emptyDescription: "No tasks matched this search in the selected project.",
    emptyTitle: "No tasks in project",
    navigationTitle: title,
    placeholder: `Search tasks in ${title}...`,
    sectionTitle: title,
  };
}

interface TaskBrowserActionItemsProps {
  activeProject?: Project;
  onRefresh: () => Promise<void>;
  onTaskCreated: (task: Task) => Promise<void>;
  onToggleHideCompleted: () => void;
  hideCompleted: boolean;
  onSetSortPreset: (presetId: TaskSortPresetId) => void;
  sortPresetId: TaskSortPresetId;
}

function TaskBrowserActionItems(props: TaskBrowserActionItemsProps) {
  const sortShortcuts: Record<
    TaskSortPresetId,
    { key: "1" | "2" | "3" | "4"; modifiers: ["cmd"] }
  > = {
    "due-date": { key: "1", modifiers: ["cmd"] },
    priority: { key: "2", modifiers: ["cmd"] },
    "recently-updated": { key: "3", modifiers: ["cmd"] },
    title: { key: "4", modifiers: ["cmd"] },
  };

  return (
    <>
      <Action.Push
        title={
          props.activeProject?.title
            ? `Create Task in ${props.activeProject.title}`
            : "Create Task"
        }
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={
          <CreateTaskFormScreen
            initialProjectId={props.activeProject?.id}
            onCreated={props.onTaskCreated}
            submitNavigation="pop"
          />
        }
      />
      <Action
        title={
          props.hideCompleted ? "Show Completed Tasks" : "Hide Completed Tasks"
        }
        icon={props.hideCompleted ? Icon.Eye : Icon.EyeDisabled}
        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
        onAction={props.onToggleHideCompleted}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={props.onRefresh}
      />
      <ActionPanel.Section title="Sort Tasks">
        {(
          Object.entries(TASK_SORT_PRESETS) as [
            TaskSortPresetId,
            (typeof TASK_SORT_PRESETS)[TaskSortPresetId],
          ][]
        ).map(([presetId, preset]) => (
          <Action
            key={presetId}
            title={
              props.sortPresetId === presetId
                ? `${preset.title} (Current)`
                : preset.title
            }
            icon={preset.icon}
            shortcut={sortShortcuts[presetId]}
            onAction={() => props.onSetSortPreset(presetId)}
          />
        ))}
      </ActionPanel.Section>
    </>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedViewId, setSelectedViewId] = useCachedState<TaskViewId>(
    "vikunja.tasks.view",
    "assigned",
  );
  const [hideCompleted, setHideCompleted] = useCachedState<boolean>(
    "vikunja.tasks.hide-completed",
    false,
  );
  const [sortPresetId, setSortPresetId] = useCachedState<TaskSortPresetId>(
    "vikunja.my-tasks.sort",
    "due-date",
  );

  const context = useCachedPromise(
    async () => {
      const [user, projects] = await Promise.all([
        getCurrentUser(),
        getProjects(),
      ]);
      return { projects, user };
    },
    [],
    {
      onError: (error) =>
        showVikunjaErrorToast(error, "Could not load Vikunja data"),
    },
  );

  const sortPreset = TASK_SORT_PRESETS[sortPresetId];
  const serviceInfo = useCachedPromise(getServiceInfo, [], {
    keepPreviousData: true,
  });
  const taskFrontendUrl = serviceInfo.data?.frontend_url ?? getWebBaseUrl();

  const tasks = useCachedPromise(
    getTasks,
    [
      {
        orderBy: sortPreset.options.orderBy,
        searchText,
        sortBy: sortPreset.options.sortBy,
      },
    ],
    {
      keepPreviousData: true,
      onError: (error) => showVikunjaErrorToast(error, "Could not load tasks"),
    },
  );

  useEffect(() => {
    if (context.isLoading) {
      return;
    }

    if (
      !isValidViewId(selectedViewId, {
        projects: context.data?.projects,
      })
    ) {
      setSelectedViewId(getFallbackViewId());
    }
  }, [
    context.data?.projects,
    context.isLoading,
    selectedViewId,
    setSelectedViewId,
  ]);

  const activeProjectId = getProjectIdFromViewId(selectedViewId);
  const activeProject = context.data?.projects.find(
    (project) => project.id === activeProjectId,
  );
  const viewDetails = getViewDetails(selectedViewId, { activeProject });
  const filteredTasks = (tasks.data ?? []).filter(
    (task) =>
      matchesView(task, selectedViewId, {
        timeZone: context.data?.user.settings?.timezone,
        userId: context.data?.user.id,
      }) &&
      (!hideCompleted || !task.done),
  );

  async function refresh() {
    await Promise.all([context.revalidate(), tasks.revalidate()]);
  }

  const commandError = context.error ?? tasks.error;

  function handleToggleHideCompleted() {
    const nextValue = !hideCompleted;
    setHideCompleted(nextValue);
    void showToast({
      style: Toast.Style.Success,
      title: nextValue ? "Completed tasks hidden" : "Completed tasks shown",
    });
  }

  async function handleTaskCreated(task: Task) {
    if (task.project_id) {
      setSelectedViewId(getProjectViewId(task.project_id));
    }

    await refresh();
  }

  function renderActionPanel() {
    return (
      <ActionPanel>
        <TaskBrowserActionItems
          activeProject={activeProject}
          onRefresh={refresh}
          onTaskCreated={handleTaskCreated}
          onToggleHideCompleted={handleToggleHideCompleted}
          hideCompleted={hideCompleted}
          onSetSortPreset={setSortPresetId}
          sortPresetId={sortPresetId}
        />
      </ActionPanel>
    );
  }

  return (
    <List
      filtering={false}
      isLoading={context.isLoading || tasks.isLoading}
      isShowingDetail
      navigationTitle={viewDetails.navigationTitle}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select View"
          onChange={(value) => setSelectedViewId(value as TaskViewId)}
          value={selectedViewId}
        >
          <List.Dropdown.Section title="Views">
            <List.Dropdown.Item
              title="Assigned to Me"
              value="assigned"
              icon={Icon.Person}
            />
            <List.Dropdown.Item
              title="Today"
              value="today"
              icon={{ source: Icon.Calendar, tintColor: Color.Orange }}
            />
            <List.Dropdown.Item title="Overview" value="all" icon={Icon.Tray} />
          </List.Dropdown.Section>
          {(context.data?.projects ?? []).length > 0 ? (
            <List.Dropdown.Section title="Projects">
              {(context.data?.projects ?? [])
                .filter((project) => project.id !== undefined)
                .map((project) => (
                  <List.Dropdown.Item
                    key={project.id}
                    title={project.title ?? `Project ${project.id}`}
                    value={getProjectViewId(project.id!)}
                    icon={project.is_archived ? Icon.Folder : Icon.List}
                  />
                ))}
            </List.Dropdown.Section>
          ) : null}
        </List.Dropdown>
      }
      searchBarPlaceholder={viewDetails.placeholder}
      throttle
    >
      {commandError && filteredTasks.length === 0 ? (
        <VikunjaErrorView
          error={commandError}
          onRetry={refresh}
          title="Could not load Vikunja tasks"
        />
      ) : null}
      {!commandError && filteredTasks.length === 0 ? (
        <List.EmptyView
          title={viewDetails.emptyTitle}
          description={
            hideCompleted
              ? `${viewDetails.emptyDescription} Completed tasks are currently hidden.`
              : viewDetails.emptyDescription
          }
          icon={selectedViewId === "today" ? Icon.Calendar : Icon.Checkmark}
          actions={renderActionPanel()}
        />
      ) : null}
      <List.Section
        title={viewDetails.sectionTitle}
        subtitle={String(filteredTasks.length)}
      >
        {filteredTasks.map((task) => (
          <TaskListItem
            key={task.id ?? task.identifier ?? task.title}
            extraActions={
              <TaskBrowserActionItems
                activeProject={activeProject}
                onRefresh={refresh}
                onTaskCreated={handleTaskCreated}
                onToggleHideCompleted={handleToggleHideCompleted}
                hideCompleted={hideCompleted}
                onSetSortPreset={setSortPresetId}
                sortPresetId={sortPresetId}
              />
            }
            task={task}
            project={context.data?.projects.find(
              (project) => project.id === task.project_id,
            )}
            showProject={!selectedViewId.startsWith("project:")}
            onRefresh={refresh}
            taskUrl={buildTaskUrl(taskFrontendUrl, task.id)}
            timeZone={context.data?.user.settings?.timezone}
          />
        ))}
      </List.Section>
    </List>
  );
}
