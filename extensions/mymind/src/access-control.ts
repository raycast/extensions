export type AccessLevel = "read-only" | "full-access";

const FULL_ACCESS_PROBE_STATUSES = new Set([400, 404, 405, 415, 422]);

export function inferAccessLevelFromProbeStatus(status?: number): AccessLevel | undefined {
  if (status === 403) {
    return "read-only";
  }

  if (status !== undefined && FULL_ACCESS_PROBE_STATUSES.has(status)) {
    return "full-access";
  }

  return undefined;
}
