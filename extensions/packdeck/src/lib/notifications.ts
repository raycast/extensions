import { environment, getPreferenceValues, LaunchType, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { AuditReport, OutdatedPackage, PackageManagerName, ProjectHealthSnapshot } from "../types";

const DISPLAY_NOTIFICATION_SCRIPT = `
on run argv
  set notifMessage to item 1 of argv
  set notifTitle to item 2 of argv
  set notifSubtitle to item 3 of argv
  display notification notifMessage with title notifTitle subtitle notifSubtitle
end run
`;

export async function sendSystemNotification(title: string, subtitle: string, message: string): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  if (prefs.enableNotifications === false) {
    return;
  }

  try {
    await runAppleScript(DISPLAY_NOTIFICATION_SCRIPT, [message, title, subtitle], { timeout: 5000 });
  } catch {
    // Notification delivery is best-effort
  }
}

export async function notifyOperationResult(options: {
  title: string;
  message?: string;
  success: boolean;
  durationMs?: number;
}): Promise<void> {
  // Menu bar commands run in the background where Toast API is unavailable; fall back to HUD
  if (environment.entryPointMode === "menu-bar") {
    await showHUD(options.message ? `${options.title} — ${options.message}` : options.title);
    return;
  }

  await showToast({
    style: options.success ? Toast.Style.Success : Toast.Style.Failure,
    title: options.title,
    message: options.message,
  });

  // For slower operations (>4s), also trigger a subtle system notification if enabled
  if ((options.durationMs ?? 0) >= 4000) {
    await sendSystemNotification(
      "Packdeck",
      options.title,
      options.message ?? (options.success ? "Completed successfully" : "Operation failed"),
    );
  }
}

export async function notifyBackgroundHealthChanges(
  current: ProjectHealthSnapshot[],
  previousMap: Record<string, ProjectHealthSnapshot>,
): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  if (prefs.enableNotifications === false) return;
  if (environment.launchType !== LaunchType.Background) return;

  const newVulnProjects: string[] = [];
  const newOutdatedProjects: string[] = [];

  for (const snap of current) {
    if (snap.lastError) continue;
    const prev = previousMap[snap.projectPath];
    if (snap.criticalOrHighCount > 0 && (!prev || snap.criticalOrHighCount > prev.criticalOrHighCount)) {
      newVulnProjects.push(`${snap.projectName} (${snap.criticalOrHighCount} high/critical)`);
    } else if (snap.vulnerabilityCount > 0 && (!prev || snap.vulnerabilityCount > prev.vulnerabilityCount)) {
      newVulnProjects.push(`${snap.projectName} (${snap.vulnerabilityCount} vulns)`);
    }

    if (snap.outdatedCount > 0 && prev && snap.outdatedCount > prev.outdatedCount) {
      newOutdatedProjects.push(`${snap.projectName} (${snap.outdatedCount} outdated)`);
    }
  }

  if (newVulnProjects.length > 0) {
    await sendSystemNotification(
      "Packdeck Security Alert",
      "Vulnerabilities detected",
      newVulnProjects.slice(0, 3).join(", "),
    );
  } else if (newOutdatedProjects.length > 0) {
    await sendSystemNotification(
      "Packdeck Updates Available",
      "Outdated dependencies found",
      newOutdatedProjects.slice(0, 3).join(", "),
    );
  }
}

export function resolveProjectHealthSnapshot(params: {
  projectPath: string;
  projectName: string;
  packageManager: PackageManagerName;
  previous?: ProjectHealthSnapshot;
  outdatedResult: PromiseSettledResult<OutdatedPackage[]>;
  auditResult: PromiseSettledResult<AuditReport>;
  now?: number;
}): ProjectHealthSnapshot {
  const { projectPath, projectName, packageManager, previous, outdatedResult, auditResult, now = Date.now() } = params;
  const errors: string[] = [];

  let outdatedCount = previous?.outdatedCount ?? 0;
  let majorOutdatedCount = previous?.majorOutdatedCount ?? 0;
  if (outdatedResult.status === "fulfilled") {
    outdatedCount = outdatedResult.value.length;
    majorOutdatedCount = outdatedResult.value.filter((o) => o.bump === "major").length;
  } else {
    const msg = outdatedResult.reason instanceof Error ? outdatedResult.reason.message : String(outdatedResult.reason);
    errors.push(`Outdated check failed: ${msg}`);
  }

  let vulnerabilityCount = previous?.vulnerabilityCount ?? 0;
  let criticalOrHighCount = previous?.criticalOrHighCount ?? 0;
  if (auditResult.status === "fulfilled" && !auditResult.value.rawError) {
    vulnerabilityCount = auditResult.value.total;
    criticalOrHighCount = auditResult.value.counts.critical + auditResult.value.counts.high;
  } else {
    const msg =
      auditResult.status === "fulfilled"
        ? (auditResult.value.rawError ?? "Audit failed")
        : auditResult.reason instanceof Error
          ? auditResult.reason.message
          : String(auditResult.reason);
    errors.push(`Security audit failed: ${msg}`);
  }

  const lastError = errors.length > 0 ? errors.join(" · ") : undefined;

  return {
    projectPath,
    projectName,
    packageManager,
    outdatedCount,
    majorOutdatedCount,
    vulnerabilityCount,
    criticalOrHighCount,
    checkedAt: lastError && previous ? previous.checkedAt : now,
    lastError,
  };
}
