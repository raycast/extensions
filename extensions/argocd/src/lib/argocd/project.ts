/**
 * Turns a raw ArgoCD Application into the row model.
 *
 * Every accessor is defensive: the input is a projected object whose shape depends on which
 * fields the server honoured, and a single malformed item must not be able to poison a list of
 * a few thousand. An item that cannot be identified is dropped by returning undefined rather
 * than substituted with a placeholder, which would show up as a phantom application.
 */

import { isAttentionWorthy, parseHealth, parseOperationPhase, parseSync } from "../model/status";
import { DiffTooLargeError, countChanges, diffLines, renderUnified, toHunks } from "../diff/lineDiff";
import { renderManifest } from "../diff/manifest";
import type {
  AppCondition,
  AppDetail,
  AppSummary,
  HistoryEntry,
  ResourceCounts,
  ResourceDiff,
  ResourceStatus,
  RevisionMetadata,
  SyncPolicy,
  SyncResultResource,
} from "./types";

/** ArgoCD omits metadata.namespace for applications living in the control-plane namespace. */
const DEFAULT_APP_NAMESPACE = "argocd";

type Dict = Record<string, unknown>;

function asDict(value: unknown): Dict | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Dict) : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function dig(root: unknown, ...path: string[]): unknown {
  let current: unknown = root;
  for (const key of path) {
    const dict = asDict(current);
    if (!dict) {
      return undefined;
    }
    current = dict[key];
  }
  return current;
}

export function buildHaystack(parts: (string | undefined)[]): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function appSetOwner(metadata: Dict): string | undefined {
  for (const reference of asArray(metadata.ownerReferences)) {
    const owner = asDict(reference);
    if (owner?.kind === "ApplicationSet") {
      return asString(owner.name);
    }
  }
  return undefined;
}

/** Multi-source applications carry spec.sources; single-source ones carry spec.source. */
function primarySource(spec: Dict | undefined): Dict | undefined {
  if (!spec) {
    return undefined;
  }
  const single = asDict(spec.source);
  if (single) {
    return single;
  }
  return asDict(asArray(spec.sources)[0]);
}

export function projectSummary(raw: unknown, instanceId: string): AppSummary | undefined {
  const app = asDict(raw);
  const metadata = asDict(app?.metadata);
  const name = asString(metadata?.name);
  if (!app || !metadata || !name) {
    return undefined;
  }

  const spec = asDict(app.spec);
  const status = asDict(app.status);
  const source = primarySource(spec);
  const destination = asDict(spec?.destination);

  const namespace = asString(metadata.namespace) ?? DEFAULT_APP_NAMESPACE;
  const project = asString(spec?.project) ?? "default";
  const destinationNamespace = asString(destination?.namespace);
  const repoUrl = asString(source?.repoURL);
  const path = asString(source?.path);
  const appSetName = appSetOwner(metadata);

  return {
    instanceId,
    name,
    namespace,
    project,
    health: parseHealth(asString(dig(status, "health", "status"))),
    sync: parseSync(asString(dig(status, "sync", "status"))),
    phase: parseOperationPhase(asString(dig(status, "operationState", "phase"))),
    finishedAt: asString(dig(status, "operationState", "finishedAt")),
    destinationServer: asString(destination?.server),
    destinationName: asString(destination?.name),
    destinationNamespace,
    repoUrl,
    path,
    targetRevision: asString(source?.targetRevision),
    revision: asString(dig(status, "sync", "revision")),
    appSetName,
    haystack: buildHaystack([name, project, namespace, destinationNamespace, repoUrl, path, appSetName]),
  };
}

function projectConditions(status: Dict | undefined): AppCondition[] {
  const conditions: AppCondition[] = [];
  for (const entry of asArray(status?.conditions)) {
    const condition = asDict(entry);
    const type = asString(condition?.type);
    if (!type) {
      continue;
    }
    conditions.push({ type, message: asString(condition?.message) ?? "" });
  }
  return conditions;
}

function projectSyncResources(status: Dict | undefined): SyncResultResource[] {
  const resources: SyncResultResource[] = [];
  const raw = dig(status, "operationState", "syncResult", "resources");
  for (const entry of asArray(raw)) {
    const resource = asDict(entry);
    const name = asString(resource?.name);
    if (!resource || !name) {
      continue;
    }
    resources.push({
      group: asString(resource.group) ?? "",
      kind: asString(resource.kind) ?? "",
      namespace: asString(resource.namespace) ?? "",
      name,
      status: asString(resource.status) ?? "",
      message: asString(resource.message) ?? "",
      hookPhase: asString(resource.hookPhase),
    });
  }
  return resources;
}

function asBool(value: unknown): boolean {
  return value === true;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return asArray(value).filter((item): item is string => typeof item === "string");
}

/**
 * `status.resources` is the resource inventory ArgoCD keeps on the application itself, so this
 * is the whole per-resource picture with no extra request. An entry with no kind and no name is
 * not identifiable and is dropped.
 */
export function projectResources(status: unknown): ResourceStatus[] {
  const resources: ResourceStatus[] = [];
  for (const entry of asArray(asDict(status)?.resources)) {
    const resource = asDict(entry);
    const name = asString(resource?.name);
    const kind = asString(resource?.kind);
    if (!resource || (!name && !kind)) {
      continue;
    }
    const rawStatus = asString(resource.status);
    resources.push({
      group: asString(resource.group) ?? "",
      version: asString(resource.version) ?? "",
      kind: kind ?? "",
      namespace: asString(resource.namespace) ?? "",
      name: name ?? "",
      // An empty status is meaningful: ArgoCD has not compared this resource yet, which is not
      // the same as Unknown.
      status: rawStatus === undefined ? "" : parseSync(rawStatus),
      health:
        asString(dig(resource, "health", "status")) === undefined
          ? undefined
          : parseHealth(asString(dig(resource, "health", "status"))),
      hook: asBool(resource.hook),
      requiresPruning: asBool(resource.requiresPruning),
      syncWave: asNumber(resource.syncWave),
    });
  }
  return resources;
}

export function countResources(resources: ResourceStatus[]): ResourceCounts {
  const counts: ResourceCounts = { total: 0, outOfSync: 0, degraded: 0, needsPruning: 0 };
  for (const resource of resources) {
    counts.total += 1;
    if (resource.status === "OutOfSync") counts.outOfSync += 1;
    if (resource.health === "Degraded") counts.degraded += 1;
    if (resource.requiresPruning) counts.needsPruning += 1;
  }
  return counts;
}

/** True for a resource the operator needs to look at, matching the list's own definition. */
export function resourceNeedsAttention(resource: ResourceStatus): boolean {
  if (resource.requiresPruning) {
    return true;
  }
  return isAttentionWorthy(
    resource.health ?? "Unknown",
    resource.status === "" ? "Unknown" : resource.status,
  );
}

/**
 * Attention first, then by kind and name. An operator opening a resource list on an out-of-sync
 * application is looking for the handful that are wrong, not for an alphabet.
 */
export function orderResources(resources: ResourceStatus[]): ResourceStatus[] {
  return [...resources].sort((a, b) => {
    const attention = Number(resourceNeedsAttention(b)) - Number(resourceNeedsAttention(a));
    if (attention !== 0) {
      return attention;
    }
    return a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name);
  });
}

export function resourceKey(resource: ResourceStatus): string {
  return [resource.group, resource.kind, resource.namespace, resource.name].join("/");
}

export function projectSyncPolicy(spec: unknown): SyncPolicy {
  const policy = asDict(asDict(spec)?.syncPolicy);
  const automated = asDict(policy?.automated);
  return {
    // ArgoCD 3.x added an explicit `enabled` flag; its absence means the block itself is the
    // switch, which is how every earlier version behaved.
    automated: automated !== undefined && automated.enabled !== false,
    prune: asBool(automated?.prune),
    selfHeal: asBool(automated?.selfHeal),
    allowEmpty: asBool(automated?.allowEmpty),
    syncOptions: asStringArray(policy?.syncOptions),
  };
}

/** Newest first, capped: ArgoCD keeps a long history and only the recent end is useful. */
export function projectHistory(status: unknown, limit = 5): HistoryEntry[] {
  const entries = asArray(asDict(status)?.history);
  const projected: HistoryEntry[] = [];
  for (const entry of [...entries].reverse().slice(0, limit)) {
    const record = asDict(entry);
    if (!record) {
      continue;
    }
    const initiatedBy = asDict(record.initiatedBy);
    projected.push({
      revision: asString(record.revision),
      deployedAt: asString(record.deployedAt),
      deployStartedAt: asString(record.deployStartedAt),
      initiatedBy: asBool(initiatedBy?.automated) ? "automated" : asString(initiatedBy?.username),
    });
  }
  return projected;
}

/**
 * One entry of the managed-resources response, diffed here.
 *
 * ArgoCD declares a `diff` field on this response and does not populate it: its own web UI
 * computes the diff client-side from `targetState` and `normalizedLiveState`. An earlier version
 * of this extension trusted the field because it existed in the schema, and reported no
 * difference on applications the web UI showed a clear diff for. So the diff is computed, and
 * ArgoCD's string is used only when it turns out to be there.
 *
 * `liveState`, `targetState` and `predictedLiveState` are dropped once the diff is rendered:
 * they are the bulk of the payload, and keeping them for hundreds of resources is what the
 * streaming read path exists to avoid.
 */
export function projectResourceDiff(raw: unknown): ResourceDiff | undefined {
  const entry = asDict(raw);
  if (!entry) {
    return undefined;
  }
  const name = asString(entry.name);
  const kind = asString(entry.kind);
  if (!name && !kind) {
    return undefined;
  }

  const identity = {
    group: asString(entry.group) ?? "",
    kind: kind ?? "",
    namespace: asString(entry.namespace) ?? "",
    name: name ?? "",
  };

  const provided = asString(entry.diff);
  if (provided) {
    return { ...identity, modified: true, diff: provided.trimEnd(), added: 0, removed: 0, tooLarge: false };
  }

  // normalizedLiveState is the live object with the fields ArgoCD ignores already removed, so
  // it is the better of the two when present.
  const live = renderManifest(asString(entry.normalizedLiveState) ?? asString(entry.liveState));
  const target = renderManifest(asString(entry.targetState));

  try {
    const lines = diffLines(live, target);
    const stats = countChanges(lines);
    return {
      ...identity,
      modified: stats.added + stats.removed > 0,
      diff: renderUnified(toHunks(lines)),
      added: stats.added,
      removed: stats.removed,
      tooLarge: false,
    };
  } catch (error) {
    if (error instanceof DiffTooLargeError) {
      return { ...identity, modified: true, diff: "", added: 0, removed: 0, tooLarge: true };
    }
    throw error;
  }
}

export function projectRevisionMetadata(raw: unknown): RevisionMetadata {
  const entry = asDict(raw);
  return {
    author: asString(entry?.author),
    date: asString(entry?.date),
    message: asString(entry?.message)?.trim(),
  };
}

export function projectDetail(raw: unknown, instanceId: string): AppDetail | undefined {
  const summary = projectSummary(raw, instanceId);
  if (!summary) {
    return undefined;
  }

  const app = asDict(raw);
  const status = asDict(app?.status);
  const history = asArray(status?.history);
  // status.history is ordered oldest first, so the most recent deployment is the last entry.
  const latest = asDict(history[history.length - 1]);

  const images = asArray(dig(status, "summary", "images"))
    .map((image) => asString(image))
    .filter((image): image is string => image !== undefined);

  const resources = projectResources(status);

  return {
    ...summary,
    conditions: projectConditions(status),
    summaryImages: images,
    operationMessage: asString(dig(status, "operationState", "message")),
    operationStartedAt: asString(dig(status, "operationState", "startedAt")),
    lastSyncRevision: asString(latest?.revision),
    lastSyncDeployedAt: asString(latest?.deployedAt),
    syncResources: projectSyncResources(status),
    resources,
    resourceCounts: countResources(resources),
    syncPolicy: projectSyncPolicy(app?.spec),
    history: projectHistory(status),
    reconciledAt: asString(status?.reconciledAt),
  };
}
