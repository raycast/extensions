import { environment, getPreferenceValues, LaunchType, showHUD, showToast, Toast } from "@raycast/api";
import { ExtensionPreferences, ProjectHealthSnapshot } from "../types";
import { execCommand } from "./env";

function escapeAppleScriptString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, " ");
}

export async function sendSystemNotification(title: string, subtitle: string, message: string): Promise<void> {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  if (prefs.enableNotifications === false) {
    return;
  }

  const safeTitle = escapeAppleScriptString(title);
  const safeSubtitle = escapeAppleScriptString(subtitle);
  const safeMessage = escapeAppleScriptString(message);

  const script = `display notification "${safeMessage}" with title "${safeTitle}" subtitle "${safeSubtitle}"`;
  await execCommand("/usr/bin/osascript", ["-e", script], { timeoutMs: 5000 });
}

export async function notifyOperationResult(options: {
  title: string;
  message?: string;
  success: boolean;
  durationMs?: number;
}): Promise<void> {
  // Menu bar commands run in the background where Toast API is unavailable; fall back to HUD
  if (environment.commandMode === "menu-bar") {
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
  const prefs = getPreferenceValues<ExtensionPreferences>();
  if (prefs.enableNotifications === false) return;
  if (environment.launchType !== LaunchType.Background) return;

  const newVulnProjects: string[] = [];
  const newOutdatedProjects: string[] = [];

  for (const snap of current) {
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
