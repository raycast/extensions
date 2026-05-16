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
  const { dataRegionURL } = getPreferenceValues<Preferences>();
  return `${dataRegionURL}/${path.replace(/^\//, "")}`;
}

/**
 * Truncate a list response so the AI doesn't drown in JSON.
 *
 * Pass `serverTotal` from the PostHog `Paginated<T>` envelope's `count` field — that's the
 * true server-side total across all pages. Returning `items.length` here would lie to the AI
 * about how much data exists, so it would stop searching after seeing the first page.
 */
export function paginate<T>(items: T[], serverTotal: number, limit = 20) {
  return {
    items: items.slice(0, limit),
    truncated: items.length > limit || serverTotal > items.length,
    total: serverTotal,
  };
}

/**
 * Parse a JSON string supplied as an AI tool input. AI models occasionally produce
 * malformed JSON; wrap `JSON.parse` so the surfaced error tells the AI exactly which
 * field failed and what it looked like, instead of bubbling up a bare `SyntaxError`.
 */
export function parseJsonInput<T = unknown>(value: string, fieldName: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${fieldName} must be valid JSON — received: ${value}`);
  }
}
