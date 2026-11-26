// Raycast glue shared by every Composer view: scope, preferences, clients, data hooks, state icons.

import { Cache, Color, Icon, Image, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef, useSyncExternalStore } from "react";
import { CacheManager } from "../../../utils/CacheManager";
import { detectGcloudPath } from "../../../utils/gcloudDetect";
import { GCP_REGIONS } from "../../../utils/regions";
import { AirflowClient } from "./airflow";
import { environmentTier, listEnvironments } from "./composer";
import { TokenProvider, gcloudTokenProvider } from "./gcloud";
import { ApiError, ComposerEnvironment, EnvironmentListing } from "./types";

export function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

// The hub passes the selected project and the gcloud path it resolved; standalone commands fall
// back to the hub's last selected project and the same auto-detection the hub uses.
const scope: { projectId?: string; gcloudPath?: string } = {};
const listeners = new Set<() => void>();

export function setComposerScope(next: { projectId?: string; gcloudPath?: string }): void {
  if (next.gcloudPath) scope.gcloudPath = next.gcloudPath;
  if (next.projectId && next.projectId !== scope.projectId) {
    scope.projectId = next.projectId;
    listeners.forEach((l) => l());
  }
}

/**
 * Apply a project handed in by a parent (the hub, a saved link) once per distinct value. Re-applying it
 * on every render would undo a project switch made inside Composer.
 */
export function useProjectProp(projectId?: string, gcloudPath?: string): void {
  const applied = useRef<string | undefined>(undefined);
  if (gcloudPath) setComposerScope({ gcloudPath });
  if (projectId && applied.current !== projectId) {
    applied.current = projectId;
    setComposerScope({ projectId });
  }
}

let detectedPath: Promise<string> | undefined;
export function resolveGcloudPath(): Promise<string> {
  const configured = scope.gcloudPath || prefs().gcloudPath;
  if (configured) return Promise.resolve(configured);
  detectedPath ??= detectGcloudPath().then((p) => p || "gcloud");
  return detectedPath;
}

/** The project Composer views work in: the hub's selected project (kept in sync both ways). */
export function currentProject(): string | undefined {
  return scope.projectId ?? CacheManager.getSelectedProject()?.projectId;
}

/** Switch project from any Composer view; every open Composer view re-renders, and the hub follows. */
export function setCurrentProject(projectId: string): void {
  CacheManager.saveSelectedProject(projectId);
  setComposerScope({ projectId });
}

/** React hook for the current project (re-renders on switch). */
export function useCurrentProject(): string | undefined {
  return useSyncExternalStore((cb) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }, currentProject);
}

export function projectList(): string[] {
  const p = currentProject();
  return p ? [p] : [];
}

/**
 * Every region, default region first. The Composer API has no location wildcard and no locations
 * list, so a full scan is ~40 small requests per project (a few seconds, cached).
 */
export function locationList(): string[] {
  const first = prefs().defaultRegion;
  return Array.from(new Set([...(first ? [first] : []), ...GCP_REGIONS.map((r) => r.name)]));
}

// Regions where a full scan last found environments, per project. Lets frequent background work
// (the menu bar) skip the full scan; entries expire so new regions are picked up within a day.
const locationCache = new Cache({ namespace: "composer-locations" });
const LOCATIONS_TTL_MS = 24 * 60 * 60 * 1000;
export function rememberLocations(project: string, locations: string[]): void {
  locationCache.set(project, JSON.stringify({ at: Date.now(), locations: Array.from(new Set(locations)) }));
}
function readLocations(project: string): { at: number; locations: string[] } | undefined {
  try {
    const v = locationCache.get(project);
    const entry = v ? (JSON.parse(v) as { at?: unknown; locations?: unknown }) : undefined;
    return typeof entry?.at === "number" && Array.isArray(entry.locations)
      ? { at: entry.at, locations: entry.locations as string[] }
      : undefined;
  } catch {
    return undefined;
  }
}
export function knownLocations(project: string): string[] | undefined {
  const entry = readLocations(project);
  return entry && Date.now() - entry.at <= LOCATIONS_TTL_MS ? entry.locations : undefined;
}

const SCAN_TTL_MS = 60_000;
const scanMemo = new Map<string, { at: number; listing: Promise<EnvironmentListing> }>();

/**
 * Full scan for the given projects, remembering where environments were found. Drill-downs remount
 * useEnvironments, so scans are shared for a minute (pass force to bypass, e.g. on Refresh).
 */
export function scanEnvironments(projects: string[], force = false): Promise<EnvironmentListing> {
  const key = projects.join(",");
  const hit = scanMemo.get(key);
  if (!force && hit && Date.now() - hit.at < SCAN_TTL_MS) return hit.listing;
  const listing = (async () => {
    await tokens().get(); // fail once (auth / gcloud missing) instead of once per region
    const raw = await listEnvironments(tokens(), projects, locationList(), { concurrency: 20 });
    projects.forEach((p) => {
      // A region that failed this time keeps its previous answer rather than being forgotten.
      const failed = new Set(raw.errors.filter((e) => e.project === p).map((e) => e.location));
      const kept = (readLocations(p)?.locations ?? []).filter((l) => failed.has(l));
      const found = raw.environments.filter((e) => e.project === p).map((e) => e.location);
      rememberLocations(p, [...found, ...kept]);
    });
    // Identical failures across regions (API disabled, no access) collapse into one row per project.
    const seen = new Map<string, EnvironmentListing["errors"][number]>();
    for (const e of raw.errors) {
      const k = `${e.project}|${e.message}`;
      const prev = seen.get(k);
      seen.set(k, prev ? { ...prev, location: "several regions" } : e);
    }
    return { environments: raw.environments, errors: [...seen.values()] };
  })();
  scanMemo.set(key, { at: Date.now(), listing });
  listing.catch(() => scanMemo.delete(key));
  return listing;
}

export const FAILURE_WINDOW_HOURS = 24;

export const LOG_TAIL_LINES = 400;

let tokenProvider: TokenProvider | undefined;
export function tokens(): TokenProvider {
  tokenProvider ??= gcloudTokenProvider(resolveGcloudPath);
  return tokenProvider;
}

const clients = new Map<string, AirflowClient>();
/** One AirflowClient per environment base URL (cheap; shares the token cache). */
export function clientFor(env: Pick<ComposerEnvironment, "airflowUri">): AirflowClient {
  let c = clients.get(env.airflowUri);
  if (!c) {
    c = new AirflowClient(env.airflowUri, tokens());
    clients.set(env.airflowUri, c);
  }
  return c;
}

/** Stable key for an environment (used for cache keys, dropdown values, React keys). */
export function envKey(env: Pick<ComposerEnvironment, "project" | "location" | "id">): string {
  return `${env.project}/${env.location}/${env.id}`;
}

/** Composer environments in the current project (all regions). Cached and kept fresh. */
export function useEnvironments() {
  const project = useCurrentProject();
  return useCachedPromise(
    async (p: string | undefined): Promise<EnvironmentListing> =>
      p ? scanEnvironments([p]) : { environments: [], errors: [] },
    [project],
    { keepPreviousData: true },
  );
}

/** Refresh helper for views: bypass the scan memo, then revalidate. */
export function refreshEnvironments(revalidate: () => void): void {
  const p = currentProject();
  if (p) scanMemo.delete(p);
  revalidate();
}

/** Only RUNNING Airflow 2 environments with an Airflow URI can be queried. */
export function queryable(envs: ComposerEnvironment[] | undefined): ComposerEnvironment[] {
  return (envs ?? []).filter((e) => !unqueryableReason(e));
}

/** Why an environment cannot be browsed here, or undefined when it can. */
export function unqueryableReason(env: ComposerEnvironment): string | undefined {
  if (isAirflow3(env))
    return `${env.id} runs Airflow ${env.airflowVersion}; only Airflow 2.x (REST API v1) is supported.`;
  if (!env.airflowUri) return `${env.id} has no Airflow web server URI yet.`;
  if (env.state !== "RUNNING" && env.state !== "UPDATING") return `${env.id} is ${env.state}, not RUNNING.`;
  return undefined;
}

/** Airflow 3 replaced the /api/v1 REST API this client speaks; such environments are listed but not queried. */
export function isAirflow3(env: Pick<ComposerEnvironment, "airflowVersion">): boolean {
  return env.airflowVersion?.startsWith("3.") ?? false;
}

// ---- presentation helpers ---------------------------------------------------------------------

export function stateColor(state?: string | null): Color {
  switch (state) {
    case "success":
      return Color.Green;
    case "failed":
    case "upstream_failed":
      return Color.Red;
    case "running":
    case "restarting":
      return Color.Blue;
    case "queued":
    case "scheduled":
    case "deferred":
      return Color.Purple;
    case "up_for_retry":
    case "up_for_reschedule":
      return Color.Orange;
    case "skipped":
    case "removed":
      return Color.SecondaryText;
    default:
      return Color.SecondaryText;
  }
}

export function stateIcon(state?: string | null): Image.ImageLike {
  const tintColor = stateColor(state);
  switch (state) {
    case "success":
      return { source: Icon.CheckCircle, tintColor };
    case "failed":
      return { source: Icon.XMarkCircle, tintColor };
    case "upstream_failed":
      return { source: Icon.ExclamationMark, tintColor };
    case "running":
    case "restarting":
      return { source: Icon.CircleProgress50, tintColor };
    case "queued":
    case "scheduled":
      return { source: Icon.Clock, tintColor };
    case "deferred":
      return { source: Icon.Hourglass, tintColor };
    case "up_for_retry":
    case "up_for_reschedule":
      return { source: Icon.RotateClockwise, tintColor };
    case "skipped":
      return { source: Icon.ArrowRight, tintColor };
    default:
      return { source: Icon.Circle, tintColor };
  }
}

export function envStateColor(state: string): Color {
  if (state === "RUNNING") return Color.Green;
  if (state === "ERROR") return Color.Red;
  if (state === "UPDATING" || state === "CREATING") return Color.Orange;
  return Color.SecondaryText;
}

export function tierColor(env: Pick<ComposerEnvironment, "id" | "project">): Color {
  switch (environmentTier(env)) {
    case "prod":
      return Color.Red;
    case "stage":
      return Color.Orange;
    case "dev":
      return Color.Green;
    default:
      return Color.SecondaryText;
  }
}

export function tierLabel(env: Pick<ComposerEnvironment, "id" | "project">): string {
  return environmentTier(env);
}

/** Human error text, with an IAM hint for 403s. */
export function errorText(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return String(e);
}
