import dayjs from "dayjs";

import { get } from "@/api/togglClient";
import type { ToggleItem } from "@/api/types";
import { cacheHelper } from "@/helpers/cache-helper";
import { liteMode, timeEntriesLookbackDays } from "@/helpers/preferences";

import type { Client } from "./clients";
import type { Project } from "./projects";
import type { Tag } from "./tags";
import type { Task } from "./tasks";
import type { TimeEntry, TimeEntryMetaData } from "./timeEntries";
import type { Workspace } from "./workspaces";

export async function getMe(): Promise<Me> {
  const cached = cacheHelper.get<Me>("me") ?? cacheHelper.getRaw<Me>("me");
  if (cached) return cached;
  await getMeWithRelatedData();
  const fromCache = cacheHelper.get<Me>("me") ?? cacheHelper.getRaw<Me>("me");
  if (fromCache) return fromCache;
  throw new Error("Failed to load user data");
}

let bootstrapPromise: Promise<
  Me & {
    workspaces?: Workspace[];
    projects?: Project[];
    clients?: Client[];
    tags?: Tag[];
    tasks?: Task[];
  }
> | null = null;

export async function getMeWithRelatedData() {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    try {
      const data = await get<
        Me & {
          workspaces?: Workspace[];
          projects?: Project[];
          clients?: Client[];
          tags?: Tag[];
          tasks?: Task[];
        }
      >("/me?with_related_data=true");

      if (data.workspaces) cacheHelper.set("workspaces", data.workspaces);
      if (data.projects) cacheHelper.set("projects", data.projects);
      if (data.clients) cacheHelper.set("clients", data.clients);
      if (data.tags) cacheHelper.set("tags", data.tags);
      if (data.tasks) cacheHelper.set("tasks", data.tasks);

      const meData = { ...data };
      delete meData.workspaces;
      delete meData.projects;
      delete meData.clients;
      delete meData.tags;
      delete meData.tasks;
      cacheHelper.set("me", meData);
      return data;
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}

const LITE_MODE_SYNC_INTERVAL = 3_600_000; // 1 hour

/** Returns true if low data mode is on and the last sync was over 1 hour ago. */
export function isLiteModeSyncDue(): boolean {
  if (!liteMode) return false;
  const lastSync = cacheHelper.getRaw<number>("lastLiteModeSync");
  if (lastSync === null) return true;
  return Date.now() - lastSync > LITE_MODE_SYNC_INTERVAL;
}

/**
 * Force a full API refresh: bootstrap + running entry + time entries.
 * Used for the manual Sync action, cold-start seeding, and hourly auto-sync.
 * Concurrent callers share the same in-flight promise.
 */
let syncPromise: Promise<void> | null = null;

export function liteModeSync(): Promise<void> {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      const lookbackDays = Math.min(Number(timeEntriesLookbackDays) || 14, 60);
      const startDate = dayjs().subtract(lookbackDays, "day").toDate();
      const endDate = dayjs().toDate();

      await getMeWithRelatedData();

      const [running, timeEntries] = await Promise.all([
        get<TimeEntry | null>("/me/time_entries/current"),
        get<(TimeEntry & TimeEntryMetaData)[]>(
          `/me/time_entries?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&meta=true`,
        ),
      ]);

      if (running) {
        cacheHelper.set("runningTimeEntry", { ...running, tags: running.tags ?? [] });
      } else {
        cacheHelper.remove("runningTimeEntry");
      }
      cacheHelper.set(
        "timeEntries",
        timeEntries
          .map((e) => ({ ...e, tags: e.tags ?? [] }))
          .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
      );
      cacheHelper.set("lastLiteModeSync", Date.now());
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

/** Returns true if lite mode is on and critical cache keys are missing. */
export function isLiteModeColdStart(): boolean {
  return (
    liteMode &&
    (cacheHelper.getRaw("workspaces") === null ||
      cacheHelper.getRaw("projects") === null ||
      cacheHelper.getRaw("timeEntries") === null)
  );
}

/** @see {@link https://developers.track.toggl.com/docs/api/me#response Toggl Api} */
export interface Me extends ToggleItem {
  api_token?: string;
  beginning_of_week: number;
  country_id: number | null;
  created_at: string;
  default_workspace_id: number;
  email: string;
  fullname: string;
  has_password: boolean;
  image_url: string;
  intercom_hash?: string;
  openid_email: string | null;
  openid_enabled: boolean;
  oauth_providers?: string[];
  timezone: string;
  updated_at: string;
}
