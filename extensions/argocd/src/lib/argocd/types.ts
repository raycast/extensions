import type { HealthStatus, OperationPhase, SyncStatus } from "../model/status";

/**
 * The row model. Everything the applications list renders and searches on, and nothing else:
 * this is what gets cached to disk and held in memory for a few thousand applications, so
 * every added field has a cost paid thousands of times over.
 */
export interface AppSummary {
  instanceId: string;
  name: string;
  namespace: string;
  project: string;
  health: HealthStatus;
  sync: SyncStatus;
  phase: OperationPhase | undefined;
  finishedAt: string | undefined;
  destinationServer: string | undefined;
  destinationName: string | undefined;
  destinationNamespace: string | undefined;
  repoUrl: string | undefined;
  path: string | undefined;
  targetRevision: string | undefined;
  revision: string | undefined;
  /** Name of the ApplicationSet that generated this application, when there is one. */
  appSetName: string | undefined;
  /**
   * Lowercased, space-joined searchable text, precomputed at projection time. Building it once
   * here is what keeps a keystroke from re-lowercasing a few thousand strings.
   */
  haystack: string;
}

export interface SyncResultResource {
  group: string;
  kind: string;
  namespace: string;
  name: string;
  status: string;
  message: string;
  hookPhase: string | undefined;
}

export interface AppCondition {
  type: string;
  message: string;
}

/**
 * One entry of `status.resources`: what ArgoCD believes about each object the application
 * manages. It comes inside the application object, so the whole resource inventory costs no
 * extra request, which is why the detail view leads with it.
 */
export interface ResourceStatus {
  group: string;
  version: string;
  kind: string;
  namespace: string;
  name: string;
  /** "Synced", "OutOfSync", or empty when ArgoCD has not compared it yet. */
  status: SyncStatus | "";
  health: HealthStatus | undefined;
  hook: boolean;
  requiresPruning: boolean;
  syncWave: number | undefined;
}

export interface ResourceCounts {
  total: number;
  outOfSync: number;
  degraded: number;
  needsPruning: number;
}

/** `spec.syncPolicy`, flattened. Whether auto-sync is on changes what a manual sync means. */
export interface SyncPolicy {
  automated: boolean;
  prune: boolean;
  selfHeal: boolean;
  allowEmpty: boolean;
  syncOptions: string[];
}

export interface HistoryEntry {
  revision: string | undefined;
  deployedAt: string | undefined;
  deployStartedAt: string | undefined;
  /** Username, or "automated" when the ApplicationSet or auto-sync triggered it. */
  initiatedBy: string | undefined;
}

/**
 * One resource from the managed-resources endpoint, with the difference between the cluster and
 * git computed here. ArgoCD declares a `diff` field but does not populate it in practice: its
 * own web UI diffs `targetState` against `normalizedLiveState` client-side. So this carries the
 * rendered unified diff, and the raw states are dropped at projection time because they are the
 * bulk of the payload.
 */
export interface ResourceDiff {
  group: string;
  kind: string;
  namespace: string;
  name: string;
  /** True when the two states actually differ, derived from the computed diff. */
  modified: boolean;
  /** Unified diff text, ready for a ```diff fence. Empty when nothing differs. */
  diff: string;
  added: number;
  removed: number;
  /** Set when the manifest was past the diff line limit, so nothing was computed. */
  tooLarge: boolean;
}

/** `revisions/{revision}/metadata`: who committed what, for the revision actually deployed. */
export interface RevisionMetadata {
  author: string | undefined;
  date: string | undefined;
  message: string | undefined;
}

export interface AppDetail extends AppSummary {
  conditions: AppCondition[];
  summaryImages: string[];
  operationMessage: string | undefined;
  operationStartedAt: string | undefined;
  lastSyncRevision: string | undefined;
  lastSyncDeployedAt: string | undefined;
  syncResources: SyncResultResource[];
  resources: ResourceStatus[];
  resourceCounts: ResourceCounts;
  syncPolicy: SyncPolicy;
  history: HistoryEntry[];
  reconciledAt: string | undefined;
}
