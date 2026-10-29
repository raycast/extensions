import { VessloApp } from "../types";

export const REASON_LABELS: Readonly<Record<string, string>> = {
  unsignedApp: "Unsigned app",
  invalidSignature: "Invalid signature",
  notNotarized: "Not notarized",
  updateCheckStale: "Update check is stale",
  updateSourceRepeatedFailure: "Update source checks failed repeatedly",
  updateSourceUnavailable: "Update source is unavailable",
  suspectedUpdateEnded: "Update support may have ended",
  noMemoOrTags: "No memo or tags",
  subscriptionApp: "Subscription app",
  largeApp: "Large app",
  homebrewAdoptionAvailable: "Homebrew adoption available",
  noUpdateSource: "No update source",
  previouslyDeletedBundleIDMatch: "Matches a previously deleted app",
};

const ACTIVE_UPDATE_HEALTH_STATUSES = new Set([
  "stale",
  "repeatedFailure",
  "unavailable",
  "suspectedEnded",
]);

export function activeManagementReasons(app: VessloApp): string[] {
  return app.managementReasons.filter((reason) => reason !== "updateAvailable");
}

export function isActiveUpdateHealth(app: VessloApp): boolean {
  return (
    app.updateHealthStatus !== null &&
    ACTIVE_UPDATE_HEALTH_STATUSES.has(app.updateHealthStatus)
  );
}

/** Search uses the same active reasons and labels as the audit presentation. */
export function auditReviewSearchTerms(app: VessloApp): string[] {
  const reasons = [...app.securityReasons, ...activeManagementReasons(app)];
  const sourceTerms: (string | null)[] = [];
  if (isActiveUpdateHealth(app)) {
    reasons.push(...app.updateHealthReasons);
    sourceTerms.push(
      app.updateHealthStatus,
      app.updateHealthSource,
      app.updateHealthSourceIdentity,
    );
  }
  return [
    ...reasons.flatMap((reason) => [
      reason,
      Object.prototype.hasOwnProperty.call(REASON_LABELS, reason)
        ? REASON_LABELS[reason]
        : reason,
    ]),
    ...sourceTerms.filter((value): value is string => value !== null),
  ];
}
