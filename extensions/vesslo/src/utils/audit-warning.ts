import { Color, List } from "@raycast/api";
import { VessloApp } from "../types";

const REASON_LABELS: Record<string, string> = {
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

function reasonList(reasons: string[]): string {
  return reasons.map((reason) => REASON_LABELS[reason] ?? reason).join(", ");
}

function activeManagementReasons(app: VessloApp): string[] {
  return app.managementReasons.filter((reason) => reason !== "updateAvailable");
}

function isActiveUpdateHealth(app: VessloApp): boolean {
  return (
    app.updateHealthStatus !== null &&
    ACTIVE_UPDATE_HEALTH_STATUSES.has(app.updateHealthStatus)
  );
}

function displayDate(value: string | null): string | null {
  if (value === null) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function markdownValue(value: string): string {
  return value.replaceAll("`", "'");
}

export function hasAuditReview(app: VessloApp): boolean {
  return (
    app.securityReasons.length > 0 ||
    isActiveUpdateHealth(app) ||
    activeManagementReasons(app).length > 0
  );
}

export function auditWarningAccessory(
  app: VessloApp,
): List.Item.Accessory | null {
  if (app.securityReasons.length > 0) {
    return {
      tag: { value: "Security", color: Color.Red },
      tooltip: `Security review: ${reasonList(app.securityReasons)}`,
    };
  }

  if (isActiveUpdateHealth(app)) {
    const details = [
      reasonList(app.updateHealthReasons),
      app.updateHealthSource,
      app.updateHealthSourceIdentity,
    ].filter((value): value is string => value !== null && value.length > 0);
    return {
      tag: { value: "Source Check", color: Color.Orange },
      tooltip: `Update source review: ${details.join(" • ")}`,
    };
  }

  const managementReasons = activeManagementReasons(app);
  if (managementReasons.length > 0) {
    return {
      tag: { value: "Review", color: Color.SecondaryText },
      tooltip: `Review in Vesslo: ${reasonList(managementReasons)}`,
    };
  }

  return null;
}

export function auditReviewMarkdown(app: VessloApp): string {
  const lines = [
    `# ${markdownValue(app.name)}`,
    "",
    `**Update:** ${markdownValue(app.version ?? "Unknown")} → ${markdownValue(app.targetVersion ?? "Unknown")}`,
  ];

  if (app.securityReasons.length > 0) {
    lines.push("", "## Security Review");
    app.securityReasons.forEach((reason) => {
      lines.push(`- ${REASON_LABELS[reason] ?? markdownValue(reason)}`);
    });
  }

  if (isActiveUpdateHealth(app)) {
    lines.push("", "## Update Source Review");
    app.updateHealthReasons.forEach((reason) => {
      lines.push(`- ${REASON_LABELS[reason] ?? markdownValue(reason)}`);
    });
    if (app.updateHealthSource) {
      lines.push(`- **Source:** ${markdownValue(app.updateHealthSource)}`);
    }
    if (app.updateHealthSourceIdentity) {
      lines.push(
        `- **Identity:** \`${markdownValue(app.updateHealthSourceIdentity)}\``,
      );
    }
    const lastAttempt = displayDate(app.lastUpdateSourceAttemptAt);
    const lastSuccess = displayDate(app.lastUpdateSourceSuccessAt);
    if (lastAttempt) lines.push(`- **Last attempt:** ${lastAttempt}`);
    if (lastSuccess) lines.push(`- **Last success:** ${lastSuccess}`);
  }

  const managementReasons = activeManagementReasons(app);
  if (managementReasons.length > 0) {
    lines.push("", "## Management Review");
    managementReasons.forEach((reason) => {
      lines.push(`- ${REASON_LABELS[reason] ?? markdownValue(reason)}`);
    });
  }

  if (!hasAuditReview(app)) {
    lines.push("", "## Vesslo Review", "No active review items.");
  }

  lines.push("", "Open the app in Vesslo for full context and actions.");
  return lines.join("\n");
}
