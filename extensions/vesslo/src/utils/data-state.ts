import { VessloData } from "../types";
import { isUpdatableApp } from "./update-filter";

export type VessloDataStatus =
  | "loading"
  | "ready"
  | "contractMismatch"
  | "stale"
  | "missing"
  | "malformed"
  | "permissionDenied"
  | "ioError";

export type AppPathAvailability =
  | "available"
  | "missing"
  | "permissionDenied"
  | "unknown";

export interface VessloDataState {
  status: VessloDataStatus;
  data: VessloData | null;
  reason: string | null;
  checkedAt: number;
  pathAvailability: Readonly<Record<string, AppPathAvailability>>;
  updateCountAssessment?: UpdateCountAssessment;
  reviewReadinessReason?: string | null;
  homebrewReadyTargetCount?: number;
}

export type UpdateCountAssessment = {
  reportedCount: number | null;
  visibleCount: number;
} & (
  | { status: "consistent"; reason: null }
  | { status: "mismatch" | "unverifiable"; reason: string }
);

/** The current Swift producer counts explicit visibility; legacy fallback has no such contract. */
export function assessUpdateCount(data: VessloData): UpdateCountAssessment {
  const visibleCount = data.apps.filter(isUpdatableApp).length;
  const reportedCount = data.updateCount;
  const result = { reportedCount, visibleCount };
  const explicitVisibleCount = data.apps.filter(
    (app) => app.isVisibleInUpdates === true,
  ).length;
  const contradictoryVisibility = data.apps.some(
    (app) =>
      app.isVisibleInUpdates === true &&
      (app.isDeleted || app.isIgnored || app.currentTargetSkipped === true),
  );
  if (contradictoryVisibility) {
    return {
      ...result,
      status: "mismatch",
      reason:
        "The export marks a deleted, ignored, or currently skipped app as update-visible. Refresh in Vesslo before updating.",
    };
  }
  if (reportedCount === null || reportedCount === undefined) {
    return {
      ...result,
      reportedCount: null,
      status: "unverifiable",
      reason:
        "The export does not provide an update count. Update actions require a verifiable current export from Vesslo.",
    };
  }
  if (data.apps.some((app) => typeof app.isVisibleInUpdates !== "boolean")) {
    return {
      ...result,
      status: "unverifiable",
      reason:
        "Legacy or incomplete visibility fields prevent comparing the exported count with this list. Review and refresh in Vesslo before updating.",
    };
  }
  if (reportedCount !== explicitVisibleCount) {
    return {
      ...result,
      status: "mismatch",
      reason: `Vesslo reports ${reportedCount} update${reportedCount === 1 ? "" : "s"}, but the exported visibility flags contain ${explicitVisibleCount}. Refresh in Vesslo before updating.`,
    };
  }
  return { ...result, status: "consistent", reason: null };
}

export const MAX_EXPORT_AGE_MS = 24 * 60 * 60 * 1000;

export function initialVessloDataState(): VessloDataState {
  return {
    status: "loading",
    data: null,
    reason: null,
    checkedAt: 0,
    pathAvailability: {},
  };
}

/** Poll timestamps stay internal unless the visible data or its safety state changes. */
export function hasSameDataPresentation(
  previous: VessloDataState,
  next: VessloDataState,
): boolean {
  if (
    previous.status !== next.status ||
    previous.reason !== next.reason ||
    previous.reviewReadinessReason !== next.reviewReadinessReason ||
    previous.homebrewReadyTargetCount !== next.homebrewReadyTargetCount ||
    previous.data !== next.data
  ) {
    return false;
  }
  const previousPaths = Object.keys(previous.pathAvailability);
  const nextPaths = Object.keys(next.pathAvailability);
  return (
    previousPaths.length === nextPaths.length &&
    previousPaths.every(
      (path) =>
        Object.prototype.hasOwnProperty.call(next.pathAvailability, path) &&
        previous.pathAvailability[path] === next.pathAvailability[path],
    )
  );
}

/** Future and invalid dates are never considered a fresh export. */
export function validISO8601Timestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const iso =
    /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
  const match = iso.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day] = match;
  const calendar = new Date(0);
  calendar.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  return (
    calendar.getUTCFullYear() === Number(year) &&
    calendar.getUTCMonth() === Number(month) - 1 &&
    calendar.getUTCDate() === Number(day)
  );
}

export function exportFreshnessReason(
  exportedAt: string,
  now: number,
): string | null {
  if (!exportedAt)
    return "The export has no timestamp. Refresh the export in Vesslo.";
  if (!validISO8601Timestamp(exportedAt) || !Number.isFinite(now)) {
    return "The export timestamp is invalid. Refresh the export in Vesslo.";
  }
  const timestamp = Date.parse(exportedAt);
  if (timestamp > now)
    return "The export timestamp is in the future. Check the clock and refresh in Vesslo.";
  if (now - timestamp >= MAX_EXPORT_AGE_MS)
    return "The export is over 24 hours old. Refresh the export in Vesslo.";
  return null;
}

/** An export file being readable is separate from authority to create a review request. */
export function reviewSnapshotReason(
  data: VessloData,
  now: number = Date.now(),
): string | null {
  return reviewContractReason(data, now, false);
}

/** Schema 3 authorizes Homebrew targets separately from other source failures. */
export function homebrewReviewSnapshotReason(
  data: VessloData,
  now: number = Date.now(),
): string | null {
  return reviewContractReason(data, now, data.schemaVersion === 3);
}

function reviewContractReason(
  data: VessloData,
  now: number,
  targetReadiness: boolean,
): string | null {
  if (data.schemaVersion !== 2 && data.schemaVersion !== 3)
    return "This legacy export is available for browsing. A schema 2 export from Vesslo is required to review updates.";
  if (
    data.schemaVersion === 2 &&
    ["homebrewReviewV2", "homebrewTargetReadinessV1", "requestReceiptsV2"].some(
      (capability) => data.capabilities?.includes(capability),
    )
  )
    return "Target-specific Homebrew review requires a schema 3 export. Reload after updating Vesslo.";
  const capabilities =
    data.schemaVersion === 3
      ? ["homebrewReviewV2", "homebrewTargetReadinessV1", "requestReceiptsV2"]
      : ["homebrewReviewV1", "requestReceiptsV1"];
  if (
    !capabilities.every((capability) => data.capabilities?.includes(capability))
  )
    return "Vesslo has not advertised both exact Homebrew review and request receipt capabilities.";
  if (
    typeof data.publisherSessionId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      data.publisherSessionId,
    ) ||
    [data.inventoryRevision, data.exportRevision, data.checkRevision].some(
      (revision) =>
        typeof revision !== "number" ||
        !Number.isSafeInteger(revision) ||
        revision < 0,
    )
  )
    return "The export session or revision is invalid. Refresh the export in Vesslo.";
  if (
    data.checkPhase !== "ready" &&
    !(
      targetReadiness &&
      data.checkPhase === "failed" &&
      data.checkReason === "sourceFailure"
    )
  ) {
    const status =
      data.checkPhase === "checking"
        ? "still running"
        : data.checkPhase === "failed"
          ? "failed"
          : "not yet verified";
    return `The current full-inventory update check is ${status}. Complete a fresh check in Vesslo before reviewing updates.`;
  }
  if (
    data.checkRevision === 0 ||
    data.completedCheckRevision !== data.checkRevision ||
    (data.schemaVersion === 3 &&
      data.completedInventoryRevision !== data.inventoryRevision) ||
    (targetReadiness
      ? data.completedInventoryRevision !== data.inventoryRevision
      : data.checkedInventoryRevision !== data.inventoryRevision)
  )
    return "The completed check does not match the current inventory and check revisions. Run a full check in Vesslo.";
  const freshness = exportFreshnessReason(data.exportedAt, now);
  if (freshness) return freshness;
  if (!validISO8601Timestamp(data.lastUpdateCheckAt))
    return "The export has no valid completed-check timestamp. Run a full check in Vesslo.";
  const completedAt = Date.parse(data.lastUpdateCheckAt);
  if (completedAt > now || completedAt > Date.parse(data.exportedAt))
    return "The completed-check timestamp is in the future or newer than its export. Check the clock and refresh in Vesslo.";
  if (now - completedAt >= MAX_EXPORT_AGE_MS)
    return "The last completed update check is over 24 hours old. Run a full check in Vesslo.";
  const count = assessUpdateCount(data);
  return count.status === "consistent" ? null : count.reason;
}
