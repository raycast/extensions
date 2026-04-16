import { get } from "@/api/togglClient";
import type { ToggleItem } from "@/api/types";
import { cacheHelper } from "@/helpers/cache-helper";

import type { Client } from "./clients";
import type { Project } from "./projects";
import type { Tag } from "./tags";
import type { Task } from "./tasks";
import type { Workspace } from "./workspaces";

export async function getMe(): Promise<Me> {
  const cached = cacheHelper.get<Me>("me");
  if (cached) return cached;
  await getMeWithRelatedData();
  const fromCache = cacheHelper.get<Me>("me");
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
