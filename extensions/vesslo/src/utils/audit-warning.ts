import { Color, Icon, List } from "@raycast/api";
import { VessloApp } from "../types";
import {
  activeManagementReasons,
  isActiveUpdateHealth,
  REASON_LABELS,
} from "./audit-review";
import {
  displayText,
  formatDate,
  markdownText,
  sourceLabel,
} from "./display-format";

const MAX_REASONS = 20;

function reasonLabel(reason: string): string {
  return Object.prototype.hasOwnProperty.call(REASON_LABELS, reason)
    ? REASON_LABELS[reason]
    : reason;
}

function reasonList(reasons: string[]): string {
  return displayText(
    reasons.slice(0, MAX_REASONS).map(reasonLabel).join(", "),
    640,
  );
}

function appendReasons(lines: string[], reasons: string[]): void {
  reasons.slice(0, MAX_REASONS).forEach((reason) => {
    lines.push(`- ${markdownText(reasonLabel(reason), 360)}`);
  });
  if (reasons.length > MAX_REASONS) {
    lines.push(
      `- ${reasons.length - MAX_REASONS} additional reasons. Open Vesslo for the complete list.`,
    );
  }
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
  policyReviewReason: string | null = null,
): List.Item.Accessory | null {
  const explanations: string[] = [];
  if (app.securityReasons.length > 0) {
    explanations.push(`Security review: ${reasonList(app.securityReasons)}`);
  }

  if (isActiveUpdateHealth(app)) {
    const details = [
      reasonList(app.updateHealthReasons),
      app.updateHealthSource,
      app.updateHealthSourceIdentity,
    ].filter((value): value is string => value !== null && value.length > 0);
    explanations.push(
      `Update source review: ${displayText(details.join(" • "), 640)}`,
    );
  }

  const managementReasons = activeManagementReasons(app);
  if (managementReasons.length > 0) {
    explanations.push(`Management review: ${reasonList(managementReasons)}`);
  }

  if (policyReviewReason) {
    explanations.push(`Action review: ${displayText(policyReviewReason, 640)}`);
  }
  if (explanations.length === 0) return null;

  return {
    text:
      app.securityReasons.length > 0
        ? "Security"
        : isActiveUpdateHealth(app)
          ? "Source check"
          : "Review",
    icon: {
      source: Icon.Warning,
      tintColor:
        app.securityReasons.length > 0
          ? Color.Red
          : isActiveUpdateHealth(app) || policyReviewReason
            ? Color.Orange
            : Color.SecondaryText,
    },
    tooltip: explanations.join("\n"),
  };
}

export function auditReviewMarkdown(
  app: VessloApp,
  priority: "metadata" | "review" = "metadata",
): string {
  const metadata = [
    `- **${app.isDeleted ? "Recorded version" : "Installed version"}:** ${markdownText(app.version ?? "Unknown", 120)}`,
    `- **Target version:** ${markdownText(app.targetVersion ?? "Unknown", 120)}`,
    `- **Sources:** ${markdownText(app.sources.slice(0, 20).map(sourceLabel).join(", ") || "Unknown", 360)}`,
    `- **Homebrew cask:** ${markdownText(app.homebrewCask ?? "Not provided", 240)}`,
    `- **Bundle ID:** ${markdownText(app.bundleId ?? "Not provided", 320)}`,
    `- **App path:** ${markdownText(app.path || "Not provided", 1024)}`,
    `- **Developer:** ${markdownText(app.developer ?? "Unknown", 200)}`,
    `- **Record:** ${app.isDeleted ? "Deleted app history" : "Installed app"}`,
  ];
  const lines: string[] = [];

  if (app.securityReasons.length > 0) {
    lines.push("", "## Security Review");
    appendReasons(lines, app.securityReasons);
  }

  if (isActiveUpdateHealth(app)) {
    lines.push("", "## Update Source Review");
    appendReasons(lines, app.updateHealthReasons);
    if (app.updateHealthSource) {
      lines.push(
        `- **Source:** ${markdownText(sourceLabel(app.updateHealthSource), 120)}`,
      );
    }
    if (app.updateHealthSourceIdentity) {
      lines.push(
        `- **Identity:** ${markdownText(app.updateHealthSourceIdentity, 360)}`,
      );
    }
    const lastAttempt = formatDate(app.lastUpdateSourceAttemptAt);
    const lastSuccess = formatDate(app.lastUpdateSourceSuccessAt);
    if (lastAttempt) lines.push(`- **Last attempt:** ${lastAttempt}`);
    if (lastSuccess) lines.push(`- **Last success:** ${lastSuccess}`);
  }

  const managementReasons = activeManagementReasons(app);
  if (managementReasons.length > 0) {
    lines.push("", "## Management Review");
    appendReasons(lines, managementReasons);
  }

  if (!hasAuditReview(app)) {
    lines.push("", "## Vesslo Review", "No active review items.");
  }

  const details =
    priority === "review"
      ? [...lines, "", "## App Details", "", ...metadata]
      : [...metadata, ...lines];
  return [
    `# ${markdownText(app.name, 200)}`,
    "",
    ...details,
    "",
    app.isDeleted
      ? "This is a deleted app record. Its path and version are historical; no installed app or update action is available from this record."
      : "Open the app in Vesslo for full context and actions.",
  ].join("\n");
}
