/**
 * The ArgoCD health, sync and operation vocabularies, and their mapping to a
 * Raycast-free severity. The UI layer turns a Severity into a colour and an icon; keeping the
 * vocabulary here is what lets it be unit-tested without the Raycast runtime.
 */

export type HealthStatus = "Healthy" | "Progressing" | "Degraded" | "Suspended" | "Missing" | "Unknown";

export type SyncStatus = "Synced" | "OutOfSync" | "Unknown";

export type OperationPhase = "Running" | "Succeeded" | "Failed" | "Error" | "Terminating";

export type Severity = "ok" | "warn" | "error" | "info" | "muted";

const HEALTH_VALUES: readonly HealthStatus[] = [
  "Healthy",
  "Progressing",
  "Degraded",
  "Suspended",
  "Missing",
  "Unknown",
];

const SYNC_VALUES: readonly SyncStatus[] = ["Synced", "OutOfSync", "Unknown"];

const PHASE_VALUES: readonly OperationPhase[] = ["Running", "Succeeded", "Failed", "Error", "Terminating"];

const HEALTH_SEVERITY: Record<HealthStatus, Severity> = {
  Healthy: "ok",
  Progressing: "info",
  Degraded: "error",
  Suspended: "muted",
  Missing: "warn",
  Unknown: "muted",
};

const SYNC_SEVERITY: Record<SyncStatus, Severity> = {
  Synced: "ok",
  OutOfSync: "warn",
  Unknown: "muted",
};

const PHASE_SEVERITY: Record<OperationPhase, Severity> = {
  Running: "info",
  Succeeded: "ok",
  Failed: "error",
  Error: "error",
  Terminating: "warn",
};

export function parseHealth(raw: string | undefined): HealthStatus {
  return HEALTH_VALUES.find((value) => value === raw) ?? "Unknown";
}

export function parseSync(raw: string | undefined): SyncStatus {
  return SYNC_VALUES.find((value) => value === raw) ?? "Unknown";
}

export function parseOperationPhase(raw: string | undefined): OperationPhase | undefined {
  return PHASE_VALUES.find((value) => value === raw);
}

export function healthSeverity(status: HealthStatus): Severity {
  return HEALTH_SEVERITY[status];
}

export function syncSeverity(status: SyncStatus): Severity {
  return SYNC_SEVERITY[status];
}

export function operationSeverity(phase: OperationPhase): Severity {
  return PHASE_SEVERITY[phase];
}

/** Drives the "needs attention" section shown when the search box is empty. */
export function isAttentionWorthy(health: HealthStatus, sync: SyncStatus): boolean {
  return health === "Degraded" || health === "Missing" || sync === "OutOfSync";
}
