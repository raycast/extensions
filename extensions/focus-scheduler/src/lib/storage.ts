import { LocalStorage } from "@raycast/api";
import {
  CategoryOption,
  isBuiltInCategory,
  mergeCategoryOptions,
  slugifyCategory,
  titleFromSlug,
} from "./categories";
import { FocusSchedule, ScheduleRuntimeState } from "./types";

const SCHEDULES_KEY = "focus-schedules";
const RUNTIME_KEY = "focus-schedules-runtime";
const CUSTOM_CATEGORIES_KEY = "focus-custom-categories";

export async function loadSchedules(): Promise<FocusSchedule[]> {
  const raw = await LocalStorage.getItem<string>(SCHEDULES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as FocusSchedule[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSchedules(schedules: FocusSchedule[]): Promise<void> {
  await LocalStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
}

export async function upsertSchedule(schedule: FocusSchedule): Promise<void> {
  const schedules = await loadSchedules();
  const index = schedules.findIndex((s) => s.id === schedule.id);
  if (index >= 0) {
    schedules[index] = schedule;
  } else {
    schedules.push(schedule);
  }
  await saveSchedules(schedules);
}

/** Allow the schedule to start again in the current window (e.g. after create/edit). */
export async function clearScheduleStartMarker(
  scheduleId: string,
): Promise<void> {
  const runtime = await loadRuntimeState();
  delete runtime.lastStartedDate[scheduleId];
  if (runtime.activeScheduleId === scheduleId) {
    runtime.activeScheduleId = undefined;
    runtime.activeStartedDate = undefined;
  }
  await saveRuntimeState(runtime);
}

export async function deleteSchedule(id: string): Promise<void> {
  const schedules = await loadSchedules();
  await saveSchedules(schedules.filter((s) => s.id !== id));

  const runtime = await loadRuntimeState();
  delete runtime.lastStartedDate[id];
  if (runtime.activeScheduleId === id) {
    // Stop the Focus we started before dropping ownership, otherwise later
    // checks can't associate the session and it runs for the full duration.
    try {
      const { completeFocusSession } = await import("./focus");
      await completeFocusSession();
    } catch (error) {
      console.error(
        "Focus Scheduler: failed to complete session on delete",
        error,
      );
    }
    runtime.activeScheduleId = undefined;
    runtime.activeStartedDate = undefined;
  }
  await saveRuntimeState(runtime);
}

export async function loadRuntimeState(): Promise<ScheduleRuntimeState> {
  const raw = await LocalStorage.getItem<string>(RUNTIME_KEY);
  if (!raw) return { lastStartedDate: {} };
  try {
    const parsed = JSON.parse(raw) as ScheduleRuntimeState;
    return {
      lastStartedDate: parsed.lastStartedDate ?? {},
      activeScheduleId: parsed.activeScheduleId,
      activeStartedDate: parsed.activeStartedDate,
    };
  } catch {
    return { lastStartedDate: {} };
  }
}

export async function saveRuntimeState(
  state: ScheduleRuntimeState,
): Promise<void> {
  await LocalStorage.setItem(RUNTIME_KEY, JSON.stringify(state));
}

export async function loadCustomCategories(): Promise<CategoryOption[]> {
  const raw = await LocalStorage.getItem<string>(CUSTOM_CATEGORIES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CategoryOption[];
    if (!Array.isArray(parsed)) return [];

    // Recompute Raycast-compatible ids from titles (fixes older accent-stripped slugs)
    const migrated = parsed
      .filter((c) => c && typeof c.title === "string" && c.title.trim())
      .map((c) => {
        const title = c.title.trim();
        const preferredId =
          typeof c.categoryId === "string" && c.categoryId.trim()
            ? slugifyCategory(c.categoryId)
            : typeof c.id === "string" &&
                !isBuiltInCategory(c.id) &&
                c.id === slugifyCategory(title)
              ? c.id
              : slugifyCategory(title);
        return {
          id: preferredId || slugifyCategory(title),
          title,
          kind: "custom" as const,
          categoryId: c.categoryId,
          websiteHosts: c.websiteHosts,
          applicationIds: c.applicationIds,
        };
      })
      .filter((c) => c.id && !isBuiltInCategory(c.id));

    const merged = mergeCategoryOptions(migrated);
    // Persist migration quietly when ids changed
    const before = JSON.stringify(
      parsed.map((c) => ({ id: c.id, title: c.title })),
    );
    const after = JSON.stringify(
      merged.map((c) => ({ id: c.id, title: c.title })),
    );
    if (before !== after) {
      await saveCustomCategories(merged);
    }
    return merged;
  } catch {
    return [];
  }
}

export async function saveCustomCategories(
  categories: CategoryOption[],
): Promise<void> {
  const cleaned = categories
    .filter((c) => c.id && !isBuiltInCategory(c.id))
    .map((c) => ({
      id: c.id,
      title: c.title || titleFromSlug(c.id),
      kind: "custom" as const,
      categoryId: c.categoryId,
      websiteHosts: c.websiteHosts,
      applicationIds: c.applicationIds,
    }));
  await LocalStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(cleaned));
}

export async function rememberCustomCategories(
  categories: Array<string | CategoryOption>,
): Promise<CategoryOption[]> {
  const existing = await loadCustomCategories();
  const incoming: CategoryOption[] = categories.map((item) => {
    if (typeof item === "string") {
      return {
        id: slugifyCategory(item),
        title: titleFromSlug(slugifyCategory(item)),
        kind: "custom" as const,
      };
    }
    const title = item.title.trim();
    const id =
      item.categoryId?.trim() ||
      (item.id && item.id === slugifyCategory(title)
        ? item.id
        : slugifyCategory(title));
    return {
      id,
      title,
      kind: "custom" as const,
      categoryId: item.categoryId,
      websiteHosts: item.websiteHosts,
      applicationIds: item.applicationIds,
    };
  });
  const merged = mergeCategoryOptions(existing, incoming).filter(
    (c) => !isBuiltInCategory(c.id),
  );
  await saveCustomCategories(merged);
  return merged;
}
