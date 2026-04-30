import { LocalStorage } from "@raycast/api";
import type { ActivityItem } from "./types";

export type ActivityType = ActivityItem["type"];

export const ALL_ACTIVITY_TYPES: { type: ActivityType; label: string }[] = [
  { type: "pr_opened", label: "New PRs" },
  { type: "review", label: "Reviews" },
  { type: "review_comment", label: "Code Comments" },
  { type: "issue_comment", label: "Comments" },
  { type: "push", label: "Commits" },
  { type: "force_push", label: "Force Pushes" },
  { type: "label_added", label: "Labels Added" },
  { type: "label_removed", label: "Labels Removed" },
];

const STORAGE_KEY = "gh_pr_event_filters";

export type EventFilters = Record<ActivityType, boolean>;

export function defaultFilters(): EventFilters {
  const filters = {} as EventFilters;
  for (const { type } of ALL_ACTIVITY_TYPES) {
    filters[type] = true;
  }
  return filters;
}

export async function loadEventFilters(): Promise<EventFilters> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return defaultFilters();
  try {
    const saved = JSON.parse(raw) as Partial<EventFilters>;
    // Merge with defaults so new types are enabled by default
    const filters = defaultFilters();
    for (const key of Object.keys(saved) as ActivityType[]) {
      if (key in filters) {
        filters[key] = saved[key] ?? true;
      }
    }
    return filters;
  } catch {
    return defaultFilters();
  }
}

export async function saveEventFilters(filters: EventFilters): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}
