import { Clipboard, Color, Icon, MenuBarExtra, getPreferenceValues, open, openCommandPreferences } from "@raycast/api";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";

import { fetchViewTasks } from "./clickup";
import {
  buildTaskCacheKey,
  getActiveTaskId,
  getCachedTaskPayload,
  setActiveTaskId,
  setCachedTaskPayload,
} from "./storage";
import type { CachedTaskPayload, ExtensionPreferences, NormalizedTask } from "./types";

const DEFAULT_TITLE_LENGTH = 28;
const TOP_LEVEL_CALENDAR_GLYPH = "";

type MenuBarState = {
  activeTask?: NormalizedTask;
  error?: string;
  isLoading: boolean;
  tasks: NormalizedTask[];
  viewName?: string;
  viewUrl?: string;
};

export default function Command() {
  const rawPreferences = getPreferenceValues<ExtensionPreferences>();
  const {
    clickupApiToken,
    showClosedTasks = false,
    teamId,
    titleLength: configuredTitleLength,
    viewIdOrUrl,
  } = rawPreferences;
  const preferences = useMemo<ExtensionPreferences>(
    () => ({
      clickupApiToken,
      showClosedTasks,
      teamId,
      titleLength: configuredTitleLength,
      viewIdOrUrl,
    }),
    [clickupApiToken, configuredTitleLength, showClosedTasks, teamId, viewIdOrUrl],
  );
  const cacheKey = useMemo(() => buildTaskCacheKey(preferences), [preferences]);
  const titleLength = parseTitleLength(configuredTitleLength);
  const preferencesError = getPreferencesError(preferences);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [state, setState] = useState<MenuBarState>({
    isLoading: true,
    tasks: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      if (preferencesError) {
        if (!cancelled) {
          setState({
            error: undefined,
            isLoading: false,
            tasks: [],
          });
        }

        return;
      }

      const [cachedPayload, storedActiveTaskId] = await Promise.all([
        getCachedTaskPayload(cacheKey),
        getActiveTaskId(),
      ]);

      if (cancelled) {
        return;
      }

      if (cachedPayload?.tasks.length) {
        const activeTask = getVisibleActiveTask(cachedPayload.tasks, storedActiveTaskId);

        setState({
          activeTask,
          isLoading: true,
          tasks: cachedPayload.tasks,
          viewName: cachedPayload.resolvedViewName,
          viewUrl: cachedPayload.resolvedViewUrl ?? (viewIdOrUrl.startsWith("https://") ? viewIdOrUrl : undefined),
        });

        if (activeTask && activeTask.id !== storedActiveTaskId) {
          void setActiveTaskId(activeTask.id);
        }
      } else {
        setState({
          activeTask: undefined,
          error: undefined,
          isLoading: true,
          tasks: [],
          viewName: undefined,
          viewUrl: undefined,
        });
      }

      try {
        const result = await fetchViewTasks(preferences);

        if (cancelled) {
          return;
        }

        const nextActiveTask = getVisibleActiveTask(result.tasks, storedActiveTaskId);
        const nextCachePayload: CachedTaskPayload = {
          fetchedAt: new Date().toISOString(),
          resolvedViewId: result.view.id,
          resolvedViewName: result.view.name,
          resolvedViewUrl: result.view.url,
          tasks: result.tasks,
        };

        await setCachedTaskPayload(cacheKey, nextCachePayload);

        if (nextActiveTask && nextActiveTask.id !== storedActiveTaskId) {
          await setActiveTaskId(nextActiveTask.id);
        }

        if (!cancelled) {
          setState({
            activeTask: nextActiveTask,
            isLoading: false,
            tasks: result.tasks,
            viewName: result.view.name,
            viewUrl: result.view.url,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState((currentState) => ({
            ...currentState,
            error: toErrorMessage(error),
            isLoading: false,
          }));
        }
      }
    }

    void loadState();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, preferencesError, preferences, refreshNonce, viewIdOrUrl]);

  const menuTitle = getMenuBarTitle(state, titleLength, preferencesError);
  const tooltip = getMenuBarTooltip(state, preferencesError);
  const currentTasks = useMemo(
    () => createUniqueMenuTasks(state.tasks.filter((task) => !task.isClosed)),
    [state.tasks],
  );
  const doneTasks = useMemo(() => createUniqueMenuTasks(state.tasks.filter((task) => task.isClosed)), [state.tasks]);

  const activeTask = state.activeTask;
  const viewUrl = state.viewUrl;

  return (
    <MenuBarExtra isLoading={state.isLoading} title={menuTitle} tooltip={tooltip}>
      {activeTask ? (
        <MenuBarExtra.Item
          title="Open Active Task in Browser"
          subtitle={getTaskSummarySubtitle(activeTask)}
          tooltip={getTaskTooltip(activeTask)}
          onAction={() => open(activeTask.url)}
        />
      ) : (
        <MenuBarExtra.Item
          title="Open Active Task in Browser"
          subtitle={state.tasks.length === 0 ? "No active task available" : "Select a task below"}
        />
      )}

      <MenuBarExtra.Item
        title="Go to View"
        subtitle={state.viewName ?? "Open configured ClickUp view"}
        onAction={viewUrl ? () => open(viewUrl) : undefined}
      />

      <MenuBarExtra.Item
        title="Refresh"
        subtitle={
          state.viewName
            ? `Refresh ${state.viewName} · Auto every 2 minutes`
            : "Refresh tasks from ClickUp · Auto every 2 minutes"
        }
        onAction={() => {
          setState((currentState) => ({
            ...currentState,
            error: undefined,
            isLoading: true,
          }));
          setRefreshNonce((currentValue) => currentValue + 1);
        }}
      />

      {preferencesError ? (
        <>
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title="Open Preferences"
            subtitle="Finish your ClickUp setup in Raycast"
            onAction={openCommandPreferences}
          />
        </>
      ) : null}

      {state.error ? (
        <MenuBarExtra.Item
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          title="Last Refresh Failed"
          subtitle={state.error}
          tooltip={state.error}
        />
      ) : null}

      <MenuBarExtra.Separator />

      {currentTasks.length > 0 ? (
        <MenuBarExtra.Section title="Current Tasks">
          {currentTasks.map((task) => (
            <TaskSubmenu key={task.id} task={task} isActive={task.id === state.activeTask?.id} setState={setState} />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      {doneTasks.length > 0 ? (
        <MenuBarExtra.Section title="Done Tasks">
          {doneTasks.map((task) => (
            <TaskSubmenu key={task.id} task={task} isActive={task.id === state.activeTask?.id} setState={setState} />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      {currentTasks.length === 0 && doneTasks.length === 0 ? (
        <MenuBarExtra.Item
          title={preferencesError ? "Complete ClickUp Setup" : "No Tasks In View"}
          subtitle={
            preferences.showClosedTasks
              ? "ClickUp returned no tasks for this view"
              : "No open tasks available in this view"
          }
        />
      ) : null}
    </MenuBarExtra>
  );
}

async function handleSelectTask(task: NormalizedTask, setState: Dispatch<SetStateAction<MenuBarState>>): Promise<void> {
  await setActiveTaskId(task.id);
  setState((currentState) => ({
    ...currentState,
    activeTask: task,
  }));
}

function TaskSubmenu(props: {
  isActive: boolean;
  setState: Dispatch<SetStateAction<MenuBarState>>;
  task: NormalizedTask & { menuTitle: string };
}) {
  const { isActive, setState, task } = props;
  const contextLabel = getTaskContextLabel(task);

  return (
    <MenuBarExtra.Submenu icon={getTaskStatusIcon(task)} title={task.menuTitle}>
      <MenuBarExtra.Item title={task.name} />
      <MenuBarExtra.Item icon={getMutedIcon(getTaskProgressIcon(task))} title={getTaskStatusLabel(task)} />
      <MenuBarExtra.Item icon={getMutedIcon(Icon.Calendar)} title={formatDueDateLabel(task) ?? "No due date"} />
      <MenuBarExtra.Item icon={getMutedIcon(Icon.Folder)} title={contextLabel ?? "No folder"} />
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={isActive ? "Already the active task" : "Set as Active Task"}
          onAction={isActive ? undefined : () => handleSelectTask(task, setState)}
        />
        <MenuBarExtra.Item title="Copy Task Link" onAction={() => Clipboard.copy(task.url)} />
        <MenuBarExtra.Item title="Go to Task in Browser" onAction={() => open(task.url)} />
      </MenuBarExtra.Section>
    </MenuBarExtra.Submenu>
  );
}

function createUniqueMenuTasks(tasks: NormalizedTask[]): Array<NormalizedTask & { menuTitle: string }> {
  const usedTitles = new Map<string, number>();

  return tasks.map((task) => {
    const contextLabel = getTaskContextLabel(task);
    const dueDateLabel = formatTopLevelDueDateLabel(task);
    const menuTitleBase = dueDateLabel ? `${task.name}   ◷ ${dueDateLabel}` : task.name; // Format of top level label
    const collisionCount = usedTitles.get(menuTitleBase) ?? 0;
    usedTitles.set(menuTitleBase, collisionCount + 1);

    const menuTitle = collisionCount > 0 ? `${menuTitleBase} - ${contextLabel ?? task.id}` : menuTitleBase;

    return {
      ...task,
      menuTitle,
    };
  });
}

type TaskProgressPhase = "done" | "in-progress" | "not-started";

function getTaskProgressPhase(task: Pick<NormalizedTask, "isClosed" | "statusType">): TaskProgressPhase {
  if (task.isClosed) {
    return "done";
  }

  const statusType = task.statusType?.toLowerCase();

  if (statusType === "closed" || statusType === "done") {
    return "done";
  }

  if (statusType === "custom") {
    return "in-progress";
  }

  return "not-started";
}

function getTaskProgressIcon(task: Pick<NormalizedTask, "isClosed" | "statusType">): Icon {
  switch (getTaskProgressPhase(task)) {
    case "done":
      return Icon.CircleProgress100;
    case "in-progress":
      return Icon.CircleProgress50;
    default:
      return Icon.Circle;
  }
}

function getTaskStatusIcon(task: Pick<NormalizedTask, "isClosed" | "statusColor" | "statusType">) {
  return {
    source: getTaskProgressIcon(task),
    tintColor: task.statusColor ?? Color.SecondaryText,
  };
}

function getMutedIcon(source: Icon) {
  return {
    source,
    tintColor: Color.SecondaryText,
    size: 16,
  };
}

function getVisibleActiveTask(tasks: NormalizedTask[], activeTaskId?: string): NormalizedTask | undefined {
  if (tasks.length === 0) {
    return undefined;
  }

  return tasks.find((task) => task.id === activeTaskId) ?? tasks[0];
}

function getMenuBarTitle(state: MenuBarState, titleLength: number, preferencesError?: string): string {
  if (state.activeTask) {
    return truncateTaskTitle(state.activeTask.name, titleLength);
  }

  if (preferencesError) {
    return "Set Up ClickUp";
  }

  if (state.error) {
    return "ClickUp Error";
  }

  if (state.tasks.length === 0) {
    return "No Tasks";
  }

  return "ClickUp";
}

function getMenuBarTooltip(state: MenuBarState, preferencesError?: string): string {
  if (state.activeTask) {
    return getTaskTooltip(state.activeTask);
  }

  if (preferencesError) {
    return preferencesError;
  }

  if (state.error) {
    return state.error;
  }

  return "Choose an active ClickUp task";
}

function getTaskContextLabel(
  task: Pick<NormalizedTask, "folderName" | "listName" | "partnerName">,
): string | undefined {
  return task.folderName ?? task.partnerName ?? task.listName;
}

function getTaskStatusLabel(task: Pick<NormalizedTask, "statusName">): string {
  return task.statusName;
}

function getTaskSummarySubtitle(
  task: Pick<NormalizedTask, "dueDateMs" | "folderName" | "listName" | "partnerName" | "statusName">,
): string {
  return [getTaskContextLabel(task), formatDueDateLabel(task), getTaskStatusLabel(task)].filter(Boolean).join(" | ");
}

function getTaskTooltip(
  task: Pick<NormalizedTask, "dueDateMs" | "folderName" | "listName" | "name" | "partnerName" | "statusName">,
): string {
  const summary = getTaskSummarySubtitle(task);
  return summary ? `${task.name} | ${summary}` : task.name;
}

function formatDueDateLabel(task: Pick<NormalizedTask, "dueDateMs">): string | undefined {
  if (!task.dueDateMs) {
    return undefined;
  }

  const dueDate = new Date(task.dueDateMs);
  const today = startOfDay(new Date());
  const dueDay = startOfDay(dueDate);
  const dayDifference = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);

  if (dayDifference === 0) {
    return "Today";
  }

  if (dayDifference === 1) {
    return "Tomorrow";
  }

  if (dayDifference === -1) {
    return "Yesterday";
  }

  if (dayDifference > 1 && dayDifference <= 7) {
    return `In ${dayDifference} days`;
  }

  if (dayDifference < -1 && dayDifference >= -7) {
    return `${Math.abs(dayDifference)} days ago`;
  }

  const sameYear = dueDate.getFullYear() === new Date().getFullYear();

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(dueDate);
}

function formatTopLevelDueDateLabel(task: Pick<NormalizedTask, "dueDateMs">): string | undefined {
  const dueDateLabel = formatDueDateLabel(task);

  return dueDateLabel ? `${TOP_LEVEL_CALENDAR_GLYPH} ${dueDateLabel}` : undefined;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function truncateTaskTitle(title: string, maxLength: number): string {
  const normalizedTitle = title.replace(/\s+/g, " ").trim();

  if (normalizedTitle.length <= maxLength) {
    return normalizedTitle;
  }

  if (maxLength <= 3) {
    return normalizedTitle.slice(0, maxLength);
  }

  const slicedTitle = normalizedTitle.slice(0, maxLength - 3);
  const lastSpace = slicedTitle.lastIndexOf(" ");

  if (lastSpace >= Math.floor((maxLength - 3) * 0.6)) {
    return `${slicedTitle.slice(0, lastSpace)}...`;
  }

  return `${slicedTitle.trimEnd()}...`;
}

function parseTitleLength(value?: string): number {
  const parsedValue = Number.parseInt(value ?? `${DEFAULT_TITLE_LENGTH}`, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : DEFAULT_TITLE_LENGTH;
}

function getPreferencesError(preferences: ExtensionPreferences): string | undefined {
  if (!preferences.clickupApiToken?.trim()) {
    return "Add your ClickUp API token in this command's preferences.";
  }

  if (!preferences.teamId?.trim()) {
    return "Add your ClickUp workspace ID in this command's preferences.";
  }

  if (!preferences.viewIdOrUrl?.trim()) {
    return "Add your ClickUp view ID, URL, or name in this command's preferences.";
  }

  return undefined;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown ClickUp error";
}
