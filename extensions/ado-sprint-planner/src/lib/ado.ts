import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { Preferences, WorkItem, Iteration } from "./types";

const API = "api-version=7.1";
const WORK_ITEM_TYPES = "'User Story', 'Bug', 'Task'";
const WORK_ITEM_TYPE_LIST = ["User Story", "Bug", "Task"];

// ADO state metastates we consider "open" — everything else (Resolved,
// Completed, Removed) is terminal and hidden from all views.
const OPEN_CATEGORIES = new Set(["Proposed", "InProgress"]);
const OPEN_STATES_KEY = "open-states-cache";
const OPEN_STATES_TTL_MS = 7 * 24 * 60 * 60 * 1000; // refresh weekly

function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

function baseUrl(): string {
  const { organization } = prefs();
  return `https://dev.azure.com/${encodeURIComponent(organization)}`;
}

function projectUrl(): string {
  const { project } = prefs();
  return `${baseUrl()}/${encodeURIComponent(project)}`;
}

function teamContextUrl(team: string): string {
  return `${projectUrl()}/${encodeURIComponent(team)}`;
}

function authHeader(): string {
  // ADO PAT auth is Basic with an empty username: ":<pat>"
  const token = Buffer.from(`:${prefs().pat}`).toString("base64");
  return `Basic ${token}`;
}

async function adoFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `ADO ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 300)}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

interface OpenStatesCache {
  fetchedAt: number; // epoch ms
  organization: string;
  project: string;
  extra: string; // normalized extraOpenStates the cache was built with
  openStates: string[];
}

/** Extra state names (lower-cased) the user wants treated as open, e.g. "Failed". */
function extraOpenStateNames(): Set<string> {
  return new Set(
    (prefs().extraOpenStates ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Ask ADO which states are "open" across our types: the Proposed/InProgress
 * categories, plus any state whose name matches `extra` (e.g. "Failed" — failed
 * work that needs rework, which ADO may otherwise categorize as terminal). Only
 * names that actually exist in the process are returned, so the WIQL stays valid.
 */
async function fetchOpenStatesFromAdo(extra: Set<string>): Promise<string[]> {
  const names = new Set<string>();
  await Promise.all(
    WORK_ITEM_TYPE_LIST.map(async (type) => {
      const url = `${projectUrl()}/_apis/wit/workitemtypes/${encodeURIComponent(type)}/states?${API}`;
      const data = await adoFetch<{
        value: Array<{ name: string; category: string }>;
      }>(url);
      for (const s of data.value ?? []) {
        if (
          OPEN_CATEGORIES.has(s.category) ||
          extra.has(s.name.toLowerCase())
        ) {
          names.add(s.name);
        }
      }
    }),
  );
  return [...names];
}

/**
 * The project's open state names, cached in LocalStorage for a week. Only
 * re-hits ADO when the cache is stale, empty, or the org/project changed —
 * ordinary refreshes reuse the cached list and make no extra calls.
 */
async function getOpenStates(): Promise<string[]> {
  const { organization, project } = prefs();
  const extra = extraOpenStateNames();
  const extraKey = [...extra].sort().join(",");
  const raw = await LocalStorage.getItem<string>(OPEN_STATES_KEY);
  if (raw) {
    try {
      const cache = JSON.parse(raw) as OpenStatesCache;
      const fresh = Date.now() - cache.fetchedAt < OPEN_STATES_TTL_MS;
      const sameScope =
        cache.organization === organization &&
        cache.project === project &&
        cache.extra === extraKey;
      if (fresh && sameScope && cache.openStates.length > 0) {
        return cache.openStates;
      }
    } catch {
      // Corrupt cache — fall through and refetch.
    }
  }
  const openStates = await fetchOpenStatesFromAdo(extra);
  if (openStates.length > 0) {
    const cache: OpenStatesCache = {
      fetchedAt: Date.now(),
      organization,
      project,
      extra: extraKey,
      openStates,
    };
    await LocalStorage.setItem(OPEN_STATES_KEY, JSON.stringify(cache));
  }
  return openStates;
}

/**
 * WIQL clause limiting results to open work items. Prefers ADO's own state
 * categories (auto-detected, weekly-cached) so every terminal state — Closed,
 * Resolved, Completed, Rejected, Removed — is hidden regardless of process. If
 * that lookup fails, falls back to excluding `Removed` + the configured
 * `doneState`. Single quotes are doubled to stay WIQL-safe.
 */
async function stateFilterClause(): Promise<string> {
  try {
    const open = await getOpenStates();
    if (open.length > 0) {
      const list = open.map((s) => `'${s.replace(/'/g, "''")}'`).join(", ");
      return `[System.State] IN (${list})`;
    }
  } catch {
    // Fall through to the exclusion-based fallback below.
  }
  const excluded = ["Removed"];
  const done = (prefs().doneState ?? "").trim();
  if (done && !excluded.includes(done)) excluded.push(done);
  const list = excluded.map((s) => `'${s.replace(/'/g, "''")}'`).join(", ");
  return `[System.State] NOT IN (${list})`;
}

/** Team + Teams preferences, deduped, trimmed, order-preserving. */
function configuredTeams(): string[] {
  const { team, teams } = prefs();
  const list = [team ?? "", ...(teams ?? "").split(",")]
    .map((t) => t.trim())
    .filter(Boolean);
  return Array.from(new Set(list));
}

/** A given team's current iteration (defines "this sprint" for that team). */
export async function getCurrentIteration(team?: string): Promise<Iteration> {
  const t = (team ?? prefs().team ?? "").trim();
  if (!t) throw new Error("Set a Team in preferences to plan a sprint.");
  const url = `${teamContextUrl(t)}/_apis/work/teamsettings/iterations?$timeframe=current&${API}`;
  const data = await adoFetch<{
    value: Array<{
      id: string;
      name: string;
      path: string;
      attributes?: { startDate?: string; finishDate?: string };
    }>;
  }>(url);
  const it = data.value?.[0];
  if (!it)
    throw new Error(
      `No current iteration found for team "${t}". Check the team name in preferences.`,
    );
  return {
    id: it.id,
    name: it.name,
    path: it.path,
    startDate: it.attributes?.startDate,
    finishDate: it.attributes?.finishDate,
  };
}

/** IDs of my work items in the given team's current iteration, priority-ordered. */
async function getMyCurrentIterationIds(team: string): Promise<number[]> {
  const stateClause = await stateFilterClause();
  const query = `
    SELECT [System.Id]
    FROM WorkItems
    WHERE [System.TeamProject] = @project
      AND [System.IterationPath] = @CurrentIteration
      AND [System.AssignedTo] = @Me
      AND [System.WorkItemType] IN (${WORK_ITEM_TYPES})
      AND ${stateClause}
    ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.Id] ASC`;
  // Run in team context so @CurrentIteration resolves to this team's sprint.
  const url = `${teamContextUrl(team)}/_apis/wit/wiql?${API}`;
  const data = await adoFetch<{ workItems: Array<{ id: number }> }>(url, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
  return (data.workItems ?? []).map((w) => w.id);
}

/** IDs of every non-removed work item assigned to me, project-wide (no iteration filter). */
async function getMyProjectWideIds(): Promise<number[]> {
  const stateClause = await stateFilterClause();
  const query = `
    SELECT [System.Id]
    FROM WorkItems
    WHERE [System.TeamProject] = @project
      AND [System.AssignedTo] = @Me
      AND [System.WorkItemType] IN (${WORK_ITEM_TYPES})
      AND ${stateClause}
    ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.Id] ASC`;
  const url = `${projectUrl()}/_apis/wit/wiql?${API}`;
  const data = await adoFetch<{ workItems: Array<{ id: number }> }>(url, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
  return (data.workItems ?? []).map((w) => w.id);
}

/** Batch-fetch fields for the given ids, keyed by id (unordered). */
async function getWorkItemsById(ids: number[]): Promise<Map<number, WorkItem>> {
  const byId = new Map<number, WorkItem>();
  if (ids.length === 0) return byId;
  const { organization, project } = prefs();
  const fields = [
    "System.Id",
    "System.Title",
    "System.State",
    "System.WorkItemType",
    "System.IterationPath",
    "Microsoft.VSTS.Common.Priority",
    "Microsoft.VSTS.Scheduling.StoryPoints",
  ].join(",");
  const url = `${baseUrl()}/_apis/wit/workitems?ids=${ids.join(",")}&fields=${fields}&${API}`;
  const data = await adoFetch<{
    value: Array<{ id: number; fields: Record<string, unknown> }>;
  }>(url);
  for (const wi of data.value ?? []) {
    const f = wi.fields;
    byId.set(wi.id, {
      id: wi.id,
      title: String(f["System.Title"] ?? ""),
      type: String(f["System.WorkItemType"] ?? ""),
      state: String(f["System.State"] ?? ""),
      priority: f["Microsoft.VSTS.Common.Priority"] as number | undefined,
      storyPoints: f["Microsoft.VSTS.Scheduling.StoryPoints"] as
        number | undefined,
      iterationPath: f["System.IterationPath"] as string | undefined,
      url: `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_workitems/edit/${wi.id}`,
    });
  }
  return byId;
}

/** Batch-fetch fields for the given ids, preserving the given (WIQL priority) order. */
async function getWorkItemsOrdered(ids: number[]): Promise<WorkItem[]> {
  const byId = await getWorkItemsById(ids);
  return ids.map((id) => byId.get(id)).filter((x): x is WorkItem => Boolean(x));
}

/**
 * Main entry: my current-sprint work items, priority-ordered, across every
 * configured team (Team + Teams preferences). Each item is tagged with the
 * team it came from so callers can segregate a multi-team result.
 */
export async function getMySprintItems(): Promise<WorkItem[]> {
  const teams = configuredTeams();
  if (teams.length === 0)
    throw new Error("Set Team or Additional Teams in preferences.");
  const perTeam = await Promise.all(
    teams.map(async (team) => {
      const ids = await getMyCurrentIterationIds(team);
      const items = await getWorkItemsOrdered(ids);
      return items.map((i) => ({ ...i, team }));
    }),
  );
  return perTeam.flat();
}

/** Every open work item assigned to me across the whole project, regardless of sprint/team. */
export async function getMyTickets(): Promise<WorkItem[]> {
  const ids = await getMyProjectWideIds();
  return getWorkItemsOrdered(ids);
}

/**
 * The planner's pool: current-sprint items (tagged `inSprint: true`) plus, when
 * `includeBacklog`, my other open project-wide tickets (tagged `inSprint: false`)
 * so backlog work rides along behind the sprint and actually gets closed.
 */
export async function getPlannerItems(
  includeBacklog: boolean,
): Promise<WorkItem[]> {
  if (!includeBacklog) {
    const sprint = await getMySprintItems();
    return sprint.map((i) => ({ ...i, inSprint: true }));
  }
  const [sprint, all] = await Promise.all([getMySprintItems(), getMyTickets()]);
  const sprintIds = new Set(sprint.map((i) => i.id));
  const sprintTagged = sprint.map((i) => ({ ...i, inSprint: true }));
  const backlog = all
    .filter((i) => !sprintIds.has(i.id))
    .map((i) => ({ ...i, inSprint: false }));
  return [...sprintTagged, ...backlog];
}

/** Optional: move a work item to the configured "done" state. Requires a write-scoped PAT. */
export async function setWorkItemDone(id: number): Promise<void> {
  const { doneState } = prefs();
  const url = `${baseUrl()}/_apis/wit/workitems/${id}?${API}`;
  await adoFetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json-patch+json" },
    body: JSON.stringify([
      { op: "add", path: "/fields/System.State", value: doneState || "Done" },
    ]),
  });
}
