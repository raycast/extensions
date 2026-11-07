import { getErrorStatus } from "./errors";
import { buildVersionedApiUrl, normalizeApiBasePath } from "./urls";

/**
 * Picks how "My Work Items" is fetched, per base URL and workspace:
 *
 * 1. `v2`: Plane API v2 workspace list with `assignee_id` (Cloud, Commercial).
 * 2. `custom`: v1 workspace list with server-side filters, only on servers that send
 *    `X-Plane-Work-Item-Filters: 1` (a patched Community Edition).
 * 3. `scan`: page through member projects and filter locally (works everywhere).
 *
 * Probes never throw. "Supported" is cached for 24 h and "unsupported" for 1 h, so a server that
 * gains the feature is picked up the same hour. Rate limits, auth failures,
 * 5xx and network errors are not cached, so the next run probes again.
 * This module has no Raycast imports: the store and fetcher are injected.
 */

export type BackendKind = "v2" | "custom" | "scan";
export type MyWorkItemsView = "assigned" | "created" | "subscribed" | "mentions";

export const MY_WORK_ITEMS_VIEWS: readonly MyWorkItemsView[] = ["assigned", "created", "subscribed", "mentions"];
export const BACKEND_ORDER: readonly BackendKind[] = ["v2", "custom", "scan"];

export const BACKEND_LABELS: Record<BackendKind, string> = {
  v2: "via API v2",
  custom: "via server filters",
  scan: "via project scan",
};

export const CAPABILITY_TTL_MS = 24 * 60 * 60 * 1000;
/** Shorter, so a server upgraded to v2 or the custom filters is detected within the hour. */
export const UNSUPPORTED_TTL_MS = 60 * 60 * 1000;
export const FILTERS_HEADER = "X-Plane-Work-Item-Filters";
export const FILTER_PARAMS_HEADER = "X-Plane-Work-Item-Filter-Params";

/** Same shape as Raycast's `Cache`. */
export type KeyValueStore = {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
};

export type ProbeResponse = {
  status: number;
  headers: { get(name: string): string | null };
  body: unknown;
};

/** Sends an authenticated GET. Resolves for every HTTP status; rejects only on network errors. */
export type ProbeFetcher = (url: string) => Promise<ProbeResponse>;

export type V2User = { id: string; displayName?: string };

export type ProbeOutcome<T> = { status: "supported"; value: T } | { status: "unsupported" } | { status: "unknown" };

export type Capabilities = {
  v2: boolean;
  /** The current user from the v2 probe, when it ran in this call. */
  v2User?: V2User;
  /** Present when the custom v1 filters are supported, with the params the server advertised. */
  custom?: { params: string[] };
};

type CachedEntry = { supported: boolean; params?: string[]; checkedAt: number };

/** The custom v1 query param that selects each view. All of them accept `me`. */
export const VIEW_PARAMS: Record<MyWorkItemsView, string> = {
  assigned: "assignees",
  created: "created_by",
  subscribed: "subscriber",
  mentions: "mentions",
};

const SCAN_VIEWS: ReadonlySet<MyWorkItemsView> = new Set(["assigned", "created"]);

/** Statuses at request time that mean "this backend doesn't speak our contract": invalidate and fall back. */
const FALLBACK_STATUSES: ReadonlySet<number> = new Set([400, 404]);

function isSuccess(status: number) {
  return status >= 200 && status < 300;
}

/** 429, auth failures, 5xx: say nothing about the server's capabilities, so they aren't cached. */
function isInconclusive(status: number) {
  return status === 401 || status === 403 || status === 429 || status >= 500;
}

export function capabilityKey(kind: "v2" | "custom", baseUrl: string, workspaceSlug: string): string {
  return `work-item-backend:${kind}:${normalizeApiBasePath(baseUrl)}:${workspaceSlug}`;
}

/** Parses `X-Plane-Work-Item-Filter-Params` (comma list) into unique, trimmed, lower-case names. */
export function parseFilterParams(header: string | null | undefined): string[] {
  const names = (header ?? "")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(names)];
}

/** The `id` and `display_name` of a v2 `users/me` body, or undefined when it isn't one. */
export function parseV2User(body: unknown): V2User | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const { id, display_name: displayName } = body as { id?: unknown; display_name?: unknown };
  if (typeof id !== "string" || !id) return undefined;
  return { id, displayName: typeof displayName === "string" ? displayName : undefined };
}

/** `GET /api/v2/users/me/`: v2 is available only on a 2xx JSON body with a user `id`. */
export async function probeV2(fetcher: ProbeFetcher, baseUrl: string): Promise<ProbeOutcome<V2User>> {
  let response: ProbeResponse;
  try {
    response = await fetcher(buildVersionedApiUrl(baseUrl, "v2", "users/me"));
  } catch {
    return { status: "unknown" };
  }
  if (isSuccess(response.status)) {
    const user = parseV2User(response.body);
    return user ? { status: "supported", value: user } : { status: "unsupported" };
  }
  return isInconclusive(response.status) ? { status: "unknown" } : { status: "unsupported" };
}

/**
 * `GET /api/v1/workspaces/{slug}/work-items/?assignees=me&per_page=1`: supported only when the response is 2xx
 * and carries `X-Plane-Work-Item-Filters: 1`. A plain 200 is not enough, because another server may serve
 * that path with a different meaning.
 */
export async function probeCustom(
  fetcher: ProbeFetcher,
  baseUrl: string,
  workspaceSlug: string,
): Promise<ProbeOutcome<{ params: string[] }>> {
  let response: ProbeResponse;
  try {
    const path = `workspaces/${encodeURIComponent(workspaceSlug)}/work-items`;
    response = await fetcher(buildVersionedApiUrl(baseUrl, "v1", path, { assignees: "me", per_page: 1 }));
  } catch {
    return { status: "unknown" };
  }
  if (isSuccess(response.status)) {
    if (response.headers.get(FILTERS_HEADER)?.trim() !== "1") return { status: "unsupported" };
    return { status: "supported", value: { params: parseFilterParams(response.headers.get(FILTER_PARAMS_HEADER)) } };
  }
  return isInconclusive(response.status) ? { status: "unknown" } : { status: "unsupported" };
}

function readEntry(store: KeyValueStore, key: string, now: number): CachedEntry | undefined {
  let raw: string | undefined;
  try {
    raw = store.get(key);
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  try {
    const entry = JSON.parse(raw) as CachedEntry;
    if (typeof entry?.supported !== "boolean" || typeof entry.checkedAt !== "number") return undefined;
    const ttl = entry.supported ? CAPABILITY_TTL_MS : UNSUPPORTED_TTL_MS;
    if (now - entry.checkedAt > ttl || entry.checkedAt > now) return undefined;
    return entry;
  } catch {
    return undefined;
  }
}

function writeEntry(store: KeyValueStore, key: string, entry: CachedEntry) {
  try {
    store.set(key, JSON.stringify(entry));
  } catch {
    // A failed cache write only costs a probe next time.
  }
}

type ResolveOptions = {
  store: KeyValueStore;
  fetcher: ProbeFetcher;
  baseUrl: string;
  workspaceSlug: string;
  now?: number;
};

/** Cached capabilities only, without probing (for rendering before the first fetch). Unknown counts as unsupported. */
export function readCachedCapabilities({
  store,
  baseUrl,
  workspaceSlug,
  now = Date.now(),
}: Omit<ResolveOptions, "fetcher">): Capabilities {
  const v2 = readEntry(store, capabilityKey("v2", baseUrl, workspaceSlug), now);
  const custom = readEntry(store, capabilityKey("custom", baseUrl, workspaceSlug), now);
  return {
    v2: !!v2?.supported,
    custom: custom?.supported ? { params: custom.params ?? [] } : undefined,
  };
}

/** Reads cached capabilities and probes whatever is missing or expired (both probes run in parallel). */
export async function resolveCapabilities({
  store,
  fetcher,
  baseUrl,
  workspaceSlug,
  now = Date.now(),
}: ResolveOptions): Promise<Capabilities> {
  const v2Key = capabilityKey("v2", baseUrl, workspaceSlug);
  const customKey = capabilityKey("custom", baseUrl, workspaceSlug);
  const cachedV2 = readEntry(store, v2Key, now);
  const cachedCustom = readEntry(store, customKey, now);

  const [v2Outcome, customOutcome] = await Promise.all([
    cachedV2 ? undefined : probeV2(fetcher, baseUrl),
    cachedCustom ? undefined : probeCustom(fetcher, baseUrl, workspaceSlug),
  ]);

  const capabilities: Capabilities = { v2: !!cachedV2?.supported };
  if (cachedCustom?.supported) capabilities.custom = { params: cachedCustom.params ?? [] };

  if (v2Outcome && v2Outcome.status !== "unknown") {
    const supported = v2Outcome.status === "supported";
    writeEntry(store, v2Key, { supported, checkedAt: now });
    capabilities.v2 = supported;
    if (v2Outcome.status === "supported") capabilities.v2User = v2Outcome.value;
  }
  if (customOutcome && customOutcome.status !== "unknown") {
    const params = customOutcome.status === "supported" ? customOutcome.value.params : undefined;
    writeEntry(store, customKey, { supported: !!params, params, checkedAt: now });
    if (params) capabilities.custom = { params };
  }
  return capabilities;
}

export function invalidateCapability(
  store: KeyValueStore,
  kind: BackendKind,
  baseUrl: string,
  workspaceSlug: string,
): void {
  if (kind === "scan") return;
  try {
    store.remove(capabilityKey(kind, baseUrl, workspaceSlug));
  } catch {
    // Nothing to do; the entry expires on its own.
  }
}

export function backendSupportsView(kind: BackendKind, view: MyWorkItemsView, capabilities: Capabilities): boolean {
  switch (kind) {
    case "v2":
      // v2 documents `assignee_id` but no created-by, subscriber or mention filter.
      return capabilities.v2 && view === "assigned";
    case "custom":
      return !!capabilities.custom?.params.includes(VIEW_PARAMS[view]);
    case "scan":
      return SCAN_VIEWS.has(view);
  }
}

/** Backends that can serve `view`, fastest first. */
export function backendChain(view: MyWorkItemsView, capabilities: Capabilities): BackendKind[] {
  return BACKEND_ORDER.filter((kind) => backendSupportsView(kind, view, capabilities));
}

/** Views at least one backend can serve. Assigned and Created always work (scan). */
export function supportedViews(capabilities: Capabilities): MyWorkItemsView[] {
  return MY_WORK_ITEMS_VIEWS.filter((view) => backendChain(view, capabilities).length > 0);
}

export function shouldFallBack(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status !== undefined && FALLBACK_STATUSES.has(status);
}

/**
 * Runs the first backend of `chain`. If it fails with 404 or 400 (and isn't the scan), its cached capability
 * is invalidated and the next backend runs, once. Other errors propagate.
 */
export async function runWithFallback<T>(
  chain: readonly BackendKind[],
  run: (kind: BackendKind) => Promise<T>,
  invalidate: (kind: BackendKind) => void,
): Promise<{ value: T; backend: BackendKind }> {
  const [first, next] = chain;
  if (!first) throw new Error("No backend can load this view.");
  try {
    return { value: await run(first), backend: first };
  } catch (error) {
    if (first === "scan" || !shouldFallBack(error)) throw error;
    invalidate(first);
    if (!next) throw error;
    return { value: await run(next), backend: next };
  }
}
