import type { QuickShellSettings, TerminalApplication } from "./schema";
import type { LaunchPlanEntry, ResolvedLaunchTarget } from "./windows-launch";

export type LaunchEntryGroup = {
  tabHostExecutable: string | null;
  runAsAdmin: boolean;
  entries: LaunchPlanEntry[];
};

export function usesWindowsTerminalProfiles(terminalApplication: TerminalApplication): boolean {
  return terminalApplication !== "conhost";
}

export function getWorkspaceTabHostExecutable(terminalApplication: TerminalApplication): string | null {
  if (!usesWindowsTerminalProfiles(terminalApplication)) {
    return null;
  }
  return terminalApplication === "it" ? "wtai.exe" : "wt.exe";
}

export function tryGetTabHostExecutable(
  target: ResolvedLaunchTarget,
  workspaceTabHostExecutable: string | null,
): string | null {
  if (target.kind === "wt") {
    return target.hostExecutable;
  }

  if (
    workspaceTabHostExecutable &&
    (target.kind === "powershell" || target.kind === "pwsh" || target.kind === "cmd" || target.kind === "wsl")
  ) {
    return workspaceTabHostExecutable;
  }

  return null;
}

export function groupLaunchEntries(
  entries: LaunchPlanEntry[],
  settings: QuickShellSettings,
  separateWindows: boolean,
): LaunchEntryGroup[] {
  if (separateWindows) {
    return entries.map((entry) => ({
      tabHostExecutable: null,
      runAsAdmin: entry.runAsAdmin,
      entries: [entry],
    }));
  }

  const workspaceTabHost = getWorkspaceTabHostExecutable(settings.terminalApplication);
  const groups: LaunchEntryGroup[] = [];
  const groupIndexByKey = new Map<string, number>();

  for (const entry of entries) {
    const tabHostExecutable = tryGetTabHostExecutable(entry.target, workspaceTabHost);
    if (!tabHostExecutable) {
      groups.push({
        tabHostExecutable: null,
        runAsAdmin: entry.runAsAdmin,
        entries: [entry],
      });
      continue;
    }

    const key = `${tabHostExecutable.toUpperCase()}\u001f${entry.runAsAdmin}`;
    const existingIndex = groupIndexByKey.get(key);
    if (existingIndex !== undefined) {
      groups[existingIndex].entries.push(entry);
      continue;
    }

    groupIndexByKey.set(key, groups.length);
    groups.push({
      tabHostExecutable,
      runAsAdmin: entry.runAsAdmin,
      entries: [entry],
    });
  }

  return groups;
}
