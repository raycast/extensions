// Cloud Composer API (composer.googleapis.com/v1): environment discovery. Pure.
// Note: the API rejects the "-" location wildcard, so every (project, location) pair is queried.

import { TokenProvider } from "./gcloud";
import { qs, requestJson } from "./http";
import { ApiError, ComposerEnvironment, EnvironmentListing, EnvironmentLookupError } from "./types";

const COMPOSER_API = "https://composer.googleapis.com/v1";

interface RawEnvironment {
  name: string;
  state?: string;
  createTime?: string;
  updateTime?: string;
  labels?: Record<string, string>;
  config?: {
    airflowUri?: string;
    dagGcsPrefix?: string;
    softwareConfig?: { imageVersion?: string };
  };
}

export function parseAirflowVersion(imageVersion: string): string | undefined {
  const m = imageVersion.match(/airflow-(\d+(?:\.\d+){1,2})/);
  return m?.[1];
}

export function toEnvironment(raw: RawEnvironment): ComposerEnvironment {
  const parts = raw.name.split("/");
  const imageVersion = raw.config?.softwareConfig?.imageVersion ?? "";
  return {
    name: raw.name,
    id: parts[5] ?? raw.name,
    project: parts[1] ?? "",
    location: parts[3] ?? "",
    state: raw.state ?? "STATE_UNSPECIFIED",
    imageVersion,
    airflowVersion: parseAirflowVersion(imageVersion),
    airflowUri: (raw.config?.airflowUri ?? "").replace(/\/+$/, ""),
    dagGcsPrefix: raw.config?.dagGcsPrefix,
    createTime: raw.createTime,
    updateTime: raw.updateTime,
    labels: raw.labels,
  };
}

/** List environments in one project/location. Throws ApiError on failure. */
export async function listEnvironmentsIn(
  tokens: TokenProvider,
  project: string,
  location: string,
  signal?: AbortSignal,
): Promise<ComposerEnvironment[]> {
  const out: ComposerEnvironment[] = [];
  let pageToken: string | undefined;
  do {
    const url = `${COMPOSER_API}/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(
      location,
    )}/environments${qs({ pageSize: 100, pageToken })}`;
    const page = await requestJson<{ environments?: RawEnvironment[]; nextPageToken?: string }>(tokens, url, {
      signal,
      timeoutMs: 25_000,
    });
    (page.environments ?? []).forEach((e) => out.push(toEnvironment(e)));
    pageToken = page.nextPageToken || undefined;
  } while (pageToken);
  return out;
}

/** Run async work over items with bounded concurrency, preserving order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * List environments across every (project, location) pair. Failures are collected rather than
 * thrown so one inaccessible project does not hide the rest. 403/404 on a project that simply has
 * no Composer API enabled are reported too, but callers may choose to hide them.
 */
export async function listEnvironments(
  tokens: TokenProvider,
  projects: string[],
  locations: string[],
  opts: { concurrency?: number; signal?: AbortSignal } = {},
): Promise<EnvironmentListing> {
  const pairs = projects.flatMap((project) => locations.map((location) => ({ project, location })));
  const environments: ComposerEnvironment[] = [];
  const errors: EnvironmentLookupError[] = [];
  await mapLimit(pairs, opts.concurrency ?? 12, async ({ project, location }) => {
    try {
      environments.push(...(await listEnvironmentsIn(tokens, project, location, opts.signal)));
    } catch (e) {
      errors.push({
        project,
        location,
        status: e instanceof ApiError ? e.status : undefined,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  });
  environments.sort((a, b) => a.project.localeCompare(b.project) || a.id.localeCompare(b.id));
  return { environments, errors };
}

/** Console deep links. */
export function consoleEnvironmentUrl(env: ComposerEnvironment): string {
  return `https://console.cloud.google.com/composer/environments/detail/${env.location}/${env.id}/monitoring?project=${env.project}`;
}

export function consoleLogsUrl(env: ComposerEnvironment): string {
  return `https://console.cloud.google.com/composer/environments/detail/${env.location}/${env.id}/logs?project=${env.project}`;
}

export function consoleDagsBucketUrl(env: ComposerEnvironment): string | undefined {
  if (!env.dagGcsPrefix?.startsWith("gs://")) return undefined;
  return `https://console.cloud.google.com/storage/browser/${env.dagGcsPrefix.slice(5)}?project=${env.project}`;
}

/** Rough environment tier from its id/project, for coloring and sorting. */
export function environmentTier(env: Pick<ComposerEnvironment, "id" | "project">): "prod" | "stage" | "dev" | "other" {
  const s = `${env.project} ${env.id}`.toLowerCase();
  if (/(^|[-_ ])(prod|production|prd|p)([-_ ]|$)/.test(s) || /-p-/.test(env.id)) return "prod";
  if (/(^|[-_ ])(stage|staging|s)([-_ ]|$)/.test(s) || /-s-/.test(env.id)) return "stage";
  if (/(^|[-_ ])(dev|d)([-_ ]|$)/.test(s) || /-d-/.test(env.id)) return "dev";
  return "other";
}

const TIER_ORDER = { prod: 0, stage: 1, dev: 2, other: 3 } as const;

/** Sort environments prod -> stage -> dev -> other, then by id. */
export function compareEnvironments(
  a: Pick<ComposerEnvironment, "id" | "project">,
  b: Pick<ComposerEnvironment, "id" | "project">,
): number {
  return TIER_ORDER[environmentTier(a)] - TIER_ORDER[environmentTier(b)] || a.id.localeCompare(b.id);
}
