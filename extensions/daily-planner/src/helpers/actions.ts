import { getPreferenceValues, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { differenceInCalendarDays, startOfTomorrow } from "date-fns";
import { enabledAction, TodoFormData, updateTodo } from "../api/todo-source";
import { CacheableTimeEntry, TimeEntry, TodoSourceId } from "../types";
import { cachePausedTimer, cacheRunningTimer, getCachedRunningTimer, updateRunningTimerTitle } from "./cache";
import { getPrimaryAction, getSecondaryAction, PreferenceError } from "./errors";
import { TodoItem } from "./todoList";

const { isSyncingProjects, isSyncingTags } = getPreferenceValues<{
  isSyncingProjects: boolean;
  isSyncingTags: boolean;
}>();

export async function callFunctionShowingToasts<T>({
  fn,
  initTitle,
  successTitle,
  successMessage,
  successPrimaryAction,
  successSecondaryAction,
  failureTitle,
}: {
  fn: () => Promise<T>;
  initTitle: string;
  successTitle: string;
  successMessage?: string | ((result: T) => string | undefined);
  successPrimaryAction?: Toast.ActionOptions | ((result: T) => Toast.ActionOptions);
  successSecondaryAction?: Toast.ActionOptions | ((result: T) => Toast.ActionOptions);
  failureTitle: string;
  withPop?: boolean;
}): Promise<T> {
  const toast = await showToast({ title: initTitle, style: Toast.Style.Animated });
  try {
    const result = await fn();

    toast.title = successTitle;
    toast.message = typeof successMessage === "function" ? successMessage(result) : successMessage;
    toast.style = Toast.Style.Success;
    toast.primaryAction =
      typeof successPrimaryAction === "function" ? successPrimaryAction(result) : successPrimaryAction;
    toast.secondaryAction =
      typeof successSecondaryAction === "function" ? successSecondaryAction(result) : successSecondaryAction;

    return result;
  } catch (error) {
    toast.title = failureTitle;
    toast.message = error instanceof Error ? error.message : String(error);
    toast.style = Toast.Style.Failure;
    if (error instanceof PreferenceError) {
      toast.primaryAction = getPrimaryAction(error);
      toast.secondaryAction = getSecondaryAction(error);
    }
    throw error;
  }
}

export function findRunningTimeEntry(timeEntries: TimeEntry[] | null | undefined): TimeEntry | undefined {
  return timeEntries?.find(({ end }) => !end);
}

// Update `startDate` (Reminders/Things) or `dueDate` (Todoist) if the given to-do needs to be moved to another list:
// - `startDate`/`dueDate` is missing,
// - `startDate`/`dueDate` is later than `refDate` (likely moved into the "Today" list), or
// - `startDate`/`dueDate` is today or earlier, but `refDate` is tomorrow or later (moved out of the "Today" list).
//
// Preference values (`isReschedulingOnTimeblocking`, `isReschedulingOnTimeTracking`) must be checked beforehand.
export async function updateStartDateOnListChange(
  { sourceId, todoId, startDate, dueDate }: TodoItem,
  refDate: Date | number,
  revalidateTodos: (sourceId?: TodoSourceId) => Promise<void>
) {
  const startOrDueDate = enabledAction[sourceId].setStartDate ? startDate : dueDate;

  // Ideally, in order to show procrastination on productivity reports, `startDate`/`dueDate` should not be pushed unless
  // explicitly changed. Also, to avoid changing the `startDate` of a multi-day to-do, `startDate` should not be pushed if
  // the to-do has scheduled blocks  in the past. Currently, this check is not implemented, but using `startOfTomorrow()`
  // rather than `differenceInCalendarDays(startOrDueDate, refDate) < 0` prevents start date change for carryovers.
  if (
    !startOrDueDate ||
    differenceInCalendarDays(startOrDueDate, refDate) > 0 ||
    (startOrDueDate < startOfTomorrow() && startOfTomorrow() <= refDate)
  ) {
    const newStartDate = typeof refDate === "object" ? refDate : new Date(refDate);
    await updateTodo[sourceId](todoId, { startDate: newStartDate });
    await revalidateTodos(sourceId);
  }
}

// Converts the given form data into a `timeTracker.startTimer()` and `timeTracker.updateTodoTimeEntries()` parameter.
export function toTimeEntryValues({ title, group, tags }: TodoFormData | Partial<TodoFormData>) {
  return {
    description: title,
    projectName: isSyncingProjects && group?.type === "project" ? group.title : undefined,
    tagNames: isSyncingTags ? tags?.map(({ name }) => name) : undefined,
  };
}

// A vehicle for conditional mutation/revalidation.
// Either mutateTimeEntries (for Toggl & Clockify) or revalidateTimeEntries (all 3) should be called,
// and at least one of these should be available.
export async function updateTimeEntry<T extends TimeEntry | undefined>(
  update: Promise<T>,
  {
    optimisticUpdate,
    mutateTimeEntries,
    mutateDetailTimeEntries,
    revalidateTimeEntries,
    url,
  }: {
    optimisticUpdate?: (data: TimeEntry[]) => TimeEntry[];
    mutateTimeEntries?: MutatePromise<TimeEntry[], TimeEntry[], T>;
    mutateDetailTimeEntries?: MutatePromise<TimeEntry[], TimeEntry[], T>;
    revalidateTimeEntries: (() => Promise<TimeEntry[]>) | (() => void) | undefined;
    url?: string;
  }
): Promise<T> {
  let result: T;
  let runningTimeEntry: TimeEntry | undefined = undefined;

  if (mutateTimeEntries) {
    [result] = await Promise.all([
      mutateTimeEntries(update, { optimisticUpdate }),
      mutateDetailTimeEntries ? mutateDetailTimeEntries(update, { optimisticUpdate }) : Promise.resolve(),
    ]);
  } else {
    result = await update;
    if (revalidateTimeEntries) {
      const timeEntries = await revalidateTimeEntries();
      // Update running timer title only if 1) `result` isn't a new time entry, and 2) running time entry exists.
      // `revalidateTimeEntries()` is of type `() => void` for Toggl & Clockify, but returns an array of time entries.
      runningTimeEntry = timeEntries?.find(({ end }) => !end);
      if (!(typeof result === "object" && !Array.isArray(result)) && runningTimeEntry) {
        updateRunningTimerTitle(runningTimeEntry.title);
      }
    }
  }

  // Update the cached running time entry, which is currently used solely by the menu bar command.
  // - When a new timer is started, `TimeTracker.startTimer()` returns a `TimeEntry`. Combine it with `url` to create a
  //   `CacheableTimeEntry` and cache it.
  // - When a running timer is updated or deleted, `TimeTracker` methods don't return anything useful mainly due to API
  //   limitations, e.g., Toggl bulk edit API returns time entry ids only.
  //   - If `calendarTimeTracker` is in use, any cached running timer title will be updated based on the returned data
  //     from `revalidateTimeEntries()`. Beware, raw, revalidated `TimeEntry`s should not be cached because their `start`
  //     and `end` values are `timeIntervalSinceReferenceDate` values, not JavaScript epoch-based time values.
  //   - If Toggl or Clockify is in use, the menu bar running timer can't be updated here because `mutateTimeEntries()`,
  //     unlike `revalidateTimeEntries()`, doesn't return an updated set of data.
  //
  // TODO: Make this less janky.
  if (typeof result === "object") {
    if (!Array.isArray(result)) {
      if (url) {
        // `TimeTracker.startTimer()`
        const cacheableTimeEntry: CacheableTimeEntry = { ...result, url };
        cacheRunningTimer(cacheableTimeEntry);
      }
    } else {
      if (!runningTimeEntry) {
        // `TimeTracker.deleteTimeEntries()`
        const cached = getCachedRunningTimer();
        if (cached && result.includes(cached.id)) {
          cacheRunningTimer(null);
        }
      }
    }
  } else if (result === undefined) {
    // `TimeTracker.stopTimer()`
    cacheRunningTimer(null);
  }

  cachePausedTimer(null);

  await launchCommand({ name: "show-menu-bar-timer", type: LaunchType.Background });

  return result;
}
