import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildTaskListActionSpecs,
  type TaskActionSpec,
} from "./task-action-specs";
import { getDueSoonDays } from "../lib/config";
import { formatTaskDate, fromCanonicalDateString } from "../lib/date";
import {
  getRaylogErrorMessage,
  isRaylogCorruptionError,
  RaylogRepository,
} from "../lib/storage";
import {
  filterTasks,
  getTaskFilterDescription,
  getTaskFilterLabel,
  sortTasks,
} from "../lib/tasks";
import {
  getTaskActionIcon,
  getTaskFilterIcon,
  getTaskIndicatorIcon,
  getTaskStatusIcon,
} from "../lib/task-visuals";
import {
  buildTaskDetailMarkdown,
  matchesTaskSearch,
} from "../lib/task-presentation";
import type {
  TaskListViewMode,
  TaskLogStatusBehavior,
  TaskRecord,
  TaskViewFilter,
} from "../lib/types";
import TaskForm from "./TaskForm";

interface TaskListScreenProps {
  notePath: string;
  taskIds?: string[];
  selectedTaskId?: string;
  navigationTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  hideFilters?: boolean;
  taskLogStatusBehavior?: TaskLogStatusBehavior;
}

export default function TaskListScreen({
  notePath,
  taskIds,
  selectedTaskId,
  navigationTitle,
  emptyTitle,
  emptyDescription,
  hideFilters = false,
  taskLogStatusBehavior = "auto_start",
}: TaskListScreenProps) {
  const pageSize = 200;
  const repository = useMemo(() => new RaylogRepository(notePath), [notePath]);
  const dueSoonDays = getDueSoonDays();
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<TaskViewFilter>("open");
  const [selectedViewMode, setSelectedViewMode] =
    useState<TaskListViewMode>("summary");
  const [selectedListItemId, setSelectedListItemId] = useState<string>();
  const [visibleItemCount, setVisibleItemCount] = useState(pageSize);
  const [loadError, setLoadError] = useState<string>();
  const effectiveSelectedFilter = selectedTaskId ? "all" : selectedFilter;

  const loadTasks = useCallback(async () => {
    const nextTasks = await repository.listTasks();
    setTasks(nextTasks);
  }, [repository]);

  const loadInitialState = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextTasks, nextFilter, nextViewMode] = await Promise.all([
        repository.listTasks(),
        selectedTaskId
          ? Promise.resolve<TaskViewFilter>("all")
          : repository.getListTasksFilter(),
        selectedTaskId
          ? Promise.resolve<TaskListViewMode>("summary")
          : repository.getListViewMode(),
      ]);
      setTasks(nextTasks);
      setSelectedFilter(nextFilter);
      setSelectedViewMode(nextViewMode);
      setLoadError(undefined);
    } catch (error) {
      setTasks([]);
      setLoadError(getRaylogErrorMessage(error, "Unable to load tasks."));
    } finally {
      setIsLoading(false);
    }
  }, [repository, selectedTaskId]);

  useEffect(() => {
    void loadInitialState();
  }, [loadInitialState]);

  useEffect(() => {
    if (selectedTaskId) {
      setSelectedListItemId(selectedTaskId);
    }
  }, [selectedTaskId]);

  useEffect(() => {
    setVisibleItemCount(pageSize);
  }, [pageSize, searchText, effectiveSelectedFilter, taskIds, tasks]);

  const handleSelectFilter = useCallback(
    async (filter: TaskViewFilter) => {
      setSelectedFilter(filter);

      try {
        await repository.setListTasksFilter(filter);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: isRaylogCorruptionError(error)
            ? "Raylog database is corrupted"
            : "Unable to save task view",
          message: getRaylogErrorMessage(
            error,
            "Unable to save the selected task view.",
          ),
        });
      }
    },
    [repository],
  );

  const handleSelectViewMode = useCallback(
    async (viewMode: TaskListViewMode) => {
      setSelectedViewMode(viewMode);

      try {
        await repository.setListViewMode(viewMode);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: isRaylogCorruptionError(error)
            ? "Raylog database is corrupted"
            : "Unable to save task view",
          message: getRaylogErrorMessage(
            error,
            "Unable to save the selected task view.",
          ),
        });
      }
    },
    [repository],
  );

  const scopedTasks = useMemo(() => {
    if (!taskIds) {
      return tasks;
    }

    const taskIdSet = new Set(taskIds);
    return tasks.filter((task) => taskIdSet.has(task.id));
  }, [taskIds, tasks]);

  const filteredTasks = useMemo(() => {
    if (taskIds) {
      const normalizedSearch = searchText.trim().toLowerCase();
      return sortTasks(scopedTasks).filter((task) => {
        if (!normalizedSearch) {
          return true;
        }

        return matchesTaskSearch(task, normalizedSearch, false);
      });
    }

    return filterTasks(
      scopedTasks,
      effectiveSelectedFilter,
      searchText,
      dueSoonDays,
    );
  }, [dueSoonDays, effectiveSelectedFilter, scopedTasks, searchText, taskIds]);

  const hasAnyTasks = scopedTasks.length > 0;
  const hasSearchOrFilter = searchText.trim().length > 0 || hasAnyTasks;
  const currentFilterDescription = getTaskFilterDescription(
    effectiveSelectedFilter,
  );
  const visibleTasks = filteredTasks.slice(0, visibleItemCount);
  const hasMoreVisibleTasks = visibleTasks.length < filteredTasks.length;

  useEffect(() => {
    setSelectedListItemId((currentSelection) => {
      if (!currentSelection) {
        return currentSelection;
      }

      return filteredTasks.some((task) => task.id === currentSelection)
        ? currentSelection
        : undefined;
    });
  }, [filteredTasks]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={
        selectedViewMode === "summary" && filteredTasks.length > 0
      }
      selectedItemId={selectedTaskId ?? selectedListItemId}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search tasks by header or body"
      onSearchTextChange={setSearchText}
      onSelectionChange={(id) => setSelectedListItemId(id ?? undefined)}
      filtering={false}
      pagination={{
        pageSize,
        hasMore: hasMoreVisibleTasks,
        onLoadMore: () =>
          setVisibleItemCount((currentCount) => currentCount + pageSize),
      }}
      searchBarAccessory={
        hideFilters ? undefined : (
          <TaskFilterDropdown
            selectedFilter={effectiveSelectedFilter}
            onSelectFilter={handleSelectFilter}
          />
        )
      }
    >
      {filteredTasks.length === 0 ? (
        <List.EmptyView
          title={
            loadError
              ? "Unable to load tasks"
              : (emptyTitle ??
                (hasAnyTasks ? "No tasks in this view" : "No tasks yet"))
          }
          description={
            loadError ??
            emptyDescription ??
            (hasSearchOrFilter
              ? `${currentFilterDescription} Try another view or search, or create a new task.`
              : "Create your first task or update the storage note in Raycast Settings.")
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <ViewModeAction
                  viewMode={selectedViewMode}
                  onSelectViewMode={handleSelectViewMode}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  title="Add Task"
                  icon={getTaskActionIcon("Add Task")}
                  target={
                    <TaskForm
                      notePath={notePath}
                      onDidSave={loadTasks}
                      resetOnSave
                    />
                  }
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <Action
                  title="Reload Tasks"
                  icon={getTaskActionIcon("Reload Tasks")}
                  onAction={loadTasks}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Open Extension Preferences"
                  icon={getTaskActionIcon("Open Extension Preferences")}
                  onAction={openExtensionPreferences}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : (
        visibleTasks.map((task) => (
          <TaskItem
            key={task.id}
            notePath={notePath}
            task={task}
            onReload={loadTasks}
            taskLogStatusBehavior={taskLogStatusBehavior}
            onSelectViewMode={handleSelectViewMode}
            viewMode={selectedViewMode}
            isSelected={task.id === (selectedTaskId ?? selectedListItemId)}
          />
        ))
      )}
    </List>
  );
}

interface TaskItemProps {
  notePath: string;
  onSelectViewMode: (viewMode: TaskListViewMode) => Promise<void> | void;
  task: TaskRecord;
  onReload: () => Promise<void>;
  taskLogStatusBehavior: TaskLogStatusBehavior;
  viewMode: TaskListViewMode;
  isSelected: boolean;
}

function TaskFilterDropdown({
  selectedFilter,
  onSelectFilter,
}: {
  selectedFilter: TaskViewFilter;
  onSelectFilter: (filter: TaskViewFilter) => Promise<void> | void;
}) {
  return (
    <List.Dropdown
      tooltip={getTaskFilterDescription(selectedFilter)}
      value={selectedFilter}
      onChange={(value) => void onSelectFilter(value as TaskViewFilter)}
    >
      <List.Dropdown.Item
        value="all"
        title={getTaskFilterLabel("all")}
        icon={getTaskFilterIcon("all")}
      />
      <List.Dropdown.Item
        value="open"
        title={getTaskFilterLabel("open")}
        icon={getTaskFilterIcon("open")}
      />
      <List.Dropdown.Item
        value="todo"
        title={getTaskFilterLabel("todo")}
        icon={getTaskFilterIcon("todo")}
      />
      <List.Dropdown.Item
        value="in_progress"
        title={getTaskFilterLabel("in_progress")}
        icon={getTaskFilterIcon("in_progress")}
      />
      <List.Dropdown.Item
        value="due_soon"
        title={getTaskFilterLabel("due_soon")}
        icon={getTaskFilterIcon("due_soon")}
      />
      <List.Dropdown.Item
        value="done"
        title={getTaskFilterLabel("done")}
        icon={getTaskFilterIcon("done")}
      />
      <List.Dropdown.Item
        value="archived"
        title={getTaskFilterLabel("archived")}
        icon={getTaskFilterIcon("archived")}
      />
    </List.Dropdown>
  );
}

function TaskItem({
  notePath,
  onSelectViewMode,
  task,
  onReload,
  taskLogStatusBehavior,
  viewMode,
  isSelected,
}: TaskItemProps) {
  const repository = useMemo(() => new RaylogRepository(notePath), [notePath]);
  const listAccessories = useMemo(() => buildTaskListAccessories(task), [task]);
  const actionSpecs = buildTaskListActionSpecs({
    notePath,
    repository,
    onReload,
    task,
    taskLogStatusBehavior,
  });

  return (
    <List.Item
      id={task.id}
      icon={getTaskStatusIcon(task.status)}
      title={task.header}
      subtitle={
        viewMode === "list"
          ? getTaskBodyPreview(task.body, listAccessories.length)
          : undefined
      }
      accessories={viewMode === "list" ? listAccessories : []}
      detail={
        viewMode === "summary" && isSelected ? (
          <List.Item.Detail
            markdown={buildTaskDetailMarkdown(task, { includeTopSpacer: true })}
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {actionSpecs.map((spec) => (
              <RenderedAction key={spec.title} spec={spec} />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ViewModeAction
              viewMode={viewMode}
              onSelectViewMode={onSelectViewMode}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Open Extension Preferences"
              icon={getTaskActionIcon("Open Extension Preferences")}
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ViewModeAction({
  viewMode,
  onSelectViewMode,
}: {
  viewMode: TaskListViewMode;
  onSelectViewMode: (viewMode: TaskListViewMode) => Promise<void> | void;
}) {
  const nextViewMode = viewMode === "summary" ? "list" : "summary";

  return (
    <Action
      title={nextViewMode === "list" ? "Open Task List" : "Open Task Summary"}
      icon={
        nextViewMode === "list"
          ? Icon.AppWindowList
          : Icon.AppWindowSidebarRight
      }
      shortcut={{ modifiers: ["cmd"], key: "f" }}
      onAction={() => void onSelectViewMode(nextViewMode)}
    />
  );
}

function buildTaskListAccessories(task: TaskRecord): List.Item.Accessory[] {
  const visibleDateKind = getVisibleDateKind(task);
  if (!visibleDateKind) {
    return [];
  }

  return [
    createDateAccessory(visibleDateKind, getDateValue(task, visibleDateKind)),
  ];
}

function createDateAccessory(
  kind: "start" | "due" | "completed",
  value: string | null,
): List.Item.Accessory {
  const tone = getDateTone(kind, value);
  const formattedDate =
    kind === "completed" ? formatCompletedDate(value) : formatTaskDate(value);

  return {
    icon: getTaskIndicatorIcon(kind, tone),
    text: formattedDate,
    tooltip:
      kind === "start"
        ? `Start Date: ${formattedDate}`
        : kind === "due"
          ? `Due Date: ${formattedDate}`
          : `Completed: ${formattedDate}`,
  };
}

function getDateTone(
  kind: "start" | "due" | "completed",
  value: string | null,
): "critical" | "warning" | "scheduled" | "inactive" | "info" | "success" {
  const parsed = fromCanonicalDateString(value);
  if (!parsed) {
    return "inactive";
  }

  if (kind === "start") {
    return "scheduled";
  }

  if (kind === "completed") {
    return "success";
  }

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const dueDate = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  );
  const differenceInDays =
    (dueDate.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24);

  if (differenceInDays < 0) {
    return "critical";
  }

  if (differenceInDays <= 7) {
    return "warning";
  }

  return "scheduled";
}

function getVisibleDateKind(
  task: TaskRecord,
): "start" | "due" | "completed" | undefined {
  if (task.status === "done" && task.completedAt) {
    return "completed";
  }

  if (isFutureDate(task.startDate)) {
    return "start";
  }

  return task.dueDate ? "due" : undefined;
}

function getDateValue(
  task: TaskRecord,
  kind: "start" | "due" | "completed",
): string | null {
  switch (kind) {
    case "start":
      return task.startDate;
    case "due":
      return task.dueDate;
    case "completed":
      return task.completedAt;
  }
}

function isFutureDate(value: string | null): boolean {
  const parsed = fromCanonicalDateString(value);
  if (!parsed) {
    return false;
  }

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const candidateDate = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  );

  return candidateDate.getTime() > startOfToday.getTime();
}

function getTaskBodyPreview(body: string, accessoryCount = 0): string {
  const preview = body.replace(/\s+/g, " ").trim();
  if (preview.length === 0) {
    return "No body";
  }

  const maxLength = accessoryCount > 0 ? 40 : 72;
  return preview.length > maxLength
    ? `${preview.slice(0, maxLength - 1).trimEnd()}…`
    : preview;
}

function formatCompletedDate(value: string | null): string {
  const parsed = fromCanonicalDateString(value);
  if (!parsed) {
    return "Not set";
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RenderedAction({ spec }: { spec: TaskActionSpec }) {
  if (spec.target) {
    return (
      <Action.Push
        title={spec.title}
        icon={spec.icon ?? undefined}
        shortcut={spec.shortcut}
        target={spec.target}
      />
    );
  }

  return (
    <Action
      title={spec.title}
      icon={spec.icon}
      shortcut={spec.shortcut}
      style={spec.style}
      onAction={spec.onAction}
    />
  );
}
