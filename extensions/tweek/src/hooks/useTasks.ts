import { Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  BulkUpdateItem,
  CreateTaskInput,
  TweekCalendar,
  TweekTask,
  UpdateTaskInput,
  UpdateType,
} from "../types";
import { getDashboardFetchWindowISO } from "../utils/date-utils";
import {
  bulk_complete_tasks,
  bulk_create_tasks,
  bulk_delete_tasks,
  bulk_update_tasks,
  complete_task,
  create_task,
  delete_task,
  list_tasks,
  update_task,
} from "../utils/tweek-client";
import {
  getCachedTasks,
  invalidateTaskCache,
  setCachedTasks,
} from "./useTaskCache";

export interface UseTasksOptions {
  calendarId: string;
  calendar?: TweekCalendar;
  dateFrom?: string;
  dateTo?: string;
  includeSomedayLists?: boolean;
}

export function useTasks({
  calendarId,
  calendar,
  dateFrom,
  dateTo,
  includeSomedayLists = true,
}: UseTasksOptions) {
  const defaultWindow = getDashboardFetchWindowISO();
  const effectiveDateFrom = dateFrom || defaultWindow.dateFrom;
  const effectiveDateTo = dateTo || defaultWindow.dateTo;
  const cacheScope = `${effectiveDateFrom}_${effectiveDateTo}_${includeSomedayLists ? "withLists" : "datedOnly"}`;

  const [tasks, setTasks] = useState<TweekTask[]>(() => {
    if (!calendarId) return [];
    const cached = getCachedTasks(calendarId, cacheScope, true);
    return cached ? cached.tasks : [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set(),
  );

  const fetchTasks = useCallback(
    async (forceRefresh = false) => {
      if (!calendarId) return;

      if (!forceRefresh) {
        const cached = getCachedTasks(calendarId, cacheScope, false);
        if (cached) {
          setTasks(cached.tasks);
          setIsOffline(false);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Fetch dated tasks (with recurring occurrences expanded)
        const datedPromise = list_tasks({
          calendarId,
          dateFrom: effectiveDateFrom,
          dateTo: effectiveDateTo,
          expand: true,
        });

        // 2. Optionally fetch someday lists for this calendar
        const somedayPromises =
          includeSomedayLists && calendar?.lists && calendar.lists.length > 0
            ? calendar.lists
                .filter((l) => !l.hidden && !l.webHidden)
                .map((list) =>
                  list_tasks({
                    calendarId,
                    listId: list.id,
                    expand: false,
                  }).catch(() => ({
                    data: [] as TweekTask[],
                    nextDocId: null,
                  })),
                )
            : [];

        const [datedResult, ...somedayResults] = await Promise.all([
          datedPromise,
          ...somedayPromises,
        ]);

        const mergedMap = new Map<string, TweekTask>();
        for (const t of datedResult.data) {
          mergedMap.set(t.id, t);
        }
        for (const sr of somedayResults) {
          for (const t of sr.data) {
            mergedMap.set(t.id, t);
          }
        }

        const mergedTasks = Array.from(mergedMap.values());
        setTasks(mergedTasks);
        setCachedTasks(calendarId, mergedTasks, cacheScope);
        setIsOffline(false);
      } catch (err) {
        const stale = getCachedTasks(calendarId, cacheScope, true);
        const msg =
          err instanceof Error ? err.message : "Failed to load tasks.";
        if (stale) {
          setTasks(stale.tasks);
          setIsOffline(true);
          await showToast({
            style: Toast.Style.Failure,
            title: "Offline Mode",
            message: "Showing cached tasks from last sync.",
          });
        } else {
          setError(msg);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to Load Tasks",
            message: msg,
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      calendarId,
      cacheScope,
      effectiveDateFrom,
      effectiveDateTo,
      includeSomedayLists,
      calendar,
    ],
  );

  useEffect(() => {
    if (calendarId) {
      void fetchTasks(false);
    }
  }, [calendarId, fetchTasks]);

  const handleCreateTask = useCallback(
    async (input: CreateTaskInput) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating task...",
      });

      try {
        const created = await create_task(input);
        invalidateTaskCache(input.calendarId);
        await fetchTasks(true);
        toast.style = Toast.Style.Success;
        toast.title = "Task Created";
        toast.message = input.text;
        return created;
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could Not Create Task";
        toast.message = err instanceof Error ? err.message : "Unknown error";
        throw err;
      }
    },
    [fetchTasks],
  );

  const handleUpdateTask = useCallback(
    async (
      taskId: string,
      updates: UpdateTaskInput & { originalCalendarId?: string },
      updateType?: UpdateType,
    ) => {
      // Optimistic UI update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                ...updates,
                checklist: updates.checklist
                  ? updates.checklist.map((item, idx) => ({
                      id: item.id || `opt_${idx}`,
                      text: item.text,
                      done: item.done ?? false,
                    }))
                  : t.checklist,
              }
            : t,
        ),
      );

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Updating task...",
      });

      try {
        await update_task(taskId, updates, updateType);
        invalidateTaskCache(calendarId);
        if (updates.calendarId && updates.calendarId !== calendarId) {
          invalidateTaskCache(updates.calendarId);
        }
        await fetchTasks(true);
        toast.style = Toast.Style.Success;
        toast.title = "Task Updated";
      } catch (err) {
        await fetchTasks(true);
        toast.style = Toast.Style.Failure;
        toast.title = "Update Failed";
        toast.message = err instanceof Error ? err.message : "Unknown error";
        throw err;
      }
    },
    [calendarId, fetchTasks],
  );

  const handleToggleComplete = useCallback(
    async (task: TweekTask, updateType?: UpdateType) => {
      const nextDone = !task.done;
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, done: nextDone } : t)),
      );

      try {
        await complete_task(task.id, nextDone, updateType);
        setTasks((prev) => {
          const nextList = prev.map((t) =>
            t.id === task.id ? { ...t, done: nextDone } : t,
          );
          setCachedTasks(calendarId, nextList, cacheScope);
          return nextList;
        });
        await showToast({
          style: Toast.Style.Success,
          title: nextDone ? "Marked Completed" : "Marked Pending",
          message: task.text,
        });
      } catch (err) {
        await fetchTasks(true);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Update Status",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
    [calendarId, cacheScope, fetchTasks],
  );

  const handleDeleteTask = useCallback(
    async (task: TweekTask, updateType?: UpdateType, skipConfirm = false) => {
      if (!skipConfirm) {
        const confirmed = await confirmAlert({
          title: "Delete Task",
          message: `Are you sure you want to delete "${task.text}"?${
            updateType ? ` (Scope: ${updateType.replace(/_/g, " ")})` : ""
          }`,
          icon: Icon.Trash,
          primaryAction: {
            title: "Delete",
            style: Alert.ActionStyle.Destructive,
          },
        });
        if (!confirmed) return;
      }

      setTasks((prev) => prev.filter((t) => t.id !== task.id));

      try {
        await delete_task(task.id, updateType);
        invalidateTaskCache(calendarId);
        await fetchTasks(true);
        await showToast({
          style: Toast.Style.Success,
          title: "Task Deleted",
          message: task.text,
        });
      } catch (err) {
        await fetchTasks(true);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Delete Task",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
    [calendarId, fetchTasks],
  );

  // Selection helpers for Bulk Operations
  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  const selectAllVisible = useCallback((visibleTasks: TweekTask[]) => {
    setSelectedTaskIds(new Set(visibleTasks.map((t) => t.id)));
  }, []);

  const handleBulkComplete = useCallback(
    async (done = true) => {
      const ids = Array.from(selectedTaskIds);
      if (ids.length === 0) return;

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Updating ${ids.length} tasks...`,
      });

      const res = await bulk_complete_tasks(ids, done);
      clearSelection();
      invalidateTaskCache(calendarId);
      await fetchTasks(true);

      toast.style =
        res.failed.length > 0 ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = `Completed ${res.succeeded.length}/${ids.length} tasks`;
      if (res.failed.length > 0) {
        toast.message = `${res.failed.length} failed`;
      }
    },
    [calendarId, clearSelection, fetchTasks, selectedTaskIds],
  );

  const handleBulkUpdate = useCallback(
    async (fields: Omit<BulkUpdateItem, "taskId">) => {
      const ids = Array.from(selectedTaskIds);
      if (ids.length === 0) return;

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Bulk updating ${ids.length} tasks...`,
      });

      const updates: BulkUpdateItem[] = ids.map((taskId) => ({
        taskId,
        ...fields,
      }));
      const res = await bulk_update_tasks(updates);
      clearSelection();
      invalidateTaskCache(calendarId);
      await fetchTasks(true);

      toast.style =
        res.failed.length > 0 ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = `Updated ${res.succeeded.length}/${ids.length} tasks`;
    },
    [calendarId, clearSelection, fetchTasks, selectedTaskIds],
  );

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedTaskIds);
    if (ids.length === 0) return;

    const confirmed = await confirmAlert({
      title: `Delete ${ids.length} Selected Tasks?`,
      message:
        "This action will permanently remove the selected tasks from Tweek.",
      icon: Icon.Trash,
      primaryAction: {
        title: `Delete ${ids.length} Tasks`,
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Deleting ${ids.length} tasks...`,
    });

    const res = await bulk_delete_tasks(ids);
    clearSelection();
    invalidateTaskCache(calendarId);
    await fetchTasks(true);

    toast.style =
      res.failed.length > 0 ? Toast.Style.Failure : Toast.Style.Success;
    toast.title = `Deleted ${res.succeeded.length}/${ids.length} tasks`;
  }, [calendarId, clearSelection, fetchTasks, selectedTaskIds]);

  const handleBulkCreate = useCallback(
    async (items: CreateTaskInput[]) => {
      if (items.length === 0) return;
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Creating ${items.length} tasks...`,
      });
      const res = await bulk_create_tasks(items);
      invalidateTaskCache(calendarId);
      await fetchTasks(true);
      toast.style =
        res.failed.length > 0 ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = `Created ${res.succeeded.length}/${items.length} tasks`;
      return res;
    },
    [calendarId, fetchTasks],
  );

  return {
    tasks,
    isLoading,
    isOffline,
    error,
    refreshTasks: () => fetchTasks(true),
    createTask: handleCreateTask,
    updateTask: handleUpdateTask,
    toggleComplete: handleToggleComplete,
    deleteTask: handleDeleteTask,
    // Bulk state & operations
    selectedTaskIds,
    toggleTaskSelection,
    clearSelection,
    selectAllVisible,
    bulkComplete: handleBulkComplete,
    bulkUpdate: handleBulkUpdate,
    bulkDelete: handleBulkDelete,
    bulkCreate: handleBulkCreate,
  };
}
