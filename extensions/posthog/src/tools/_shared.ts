import { LocalStorage, getPreferenceValues } from "@raycast/api";

import { getCurrentUser } from "../api/organizations";

const PROJECT_KEY = "active-project-id";
const ORG_KEY = "active-org-id";

/**
 * Returns the active project ID — either the user's previously-selected project
 * (set via `switch-project`), or their default team from `/api/users/@me/`.
 */
export async function getActiveProjectId(): Promise<string> {
  const stored = await LocalStorage.getItem<string>(PROJECT_KEY);
  if (stored) return stored;
  const me = await getCurrentUser();
  if (me.team?.id) {
    const id = String(me.team.id);
    await LocalStorage.setItem(PROJECT_KEY, id);
    return id;
  }
  throw new Error("No active PostHog project. Call `switch-project` first, or set a default team in PostHog.");
}

/**
 * Returns the active organization ID — either the user's selection or their default org.
 */
export async function getActiveOrgId(): Promise<string> {
  const stored = await LocalStorage.getItem<string>(ORG_KEY);
  if (stored) return stored;
  const me = await getCurrentUser();
  if (me.organization?.id) {
    await LocalStorage.setItem(ORG_KEY, me.organization.id);
    return me.organization.id;
  }
  throw new Error("No active PostHog organization.");
}

export async function setActiveProjectId(id: string | number) {
  await LocalStorage.setItem(PROJECT_KEY, String(id));
}

export async function setActiveOrgId(id: string) {
  await LocalStorage.setItem(ORG_KEY, id);
}

export function projectUrl(path: string) {
  const { dataRegionURL } = getPreferenceValues<{ dataRegionURL: string }>();
  return `${dataRegionURL}/${path.replace(/^\//, "")}`;
}

/** Truncate large list responses so AI doesn't drown in JSON. */
export function paginate<T>(items: T[], limit = 20) {
  if (items.length <= limit) return { items, truncated: false, total: items.length };
  return { items: items.slice(0, limit), truncated: true, total: items.length };
}
