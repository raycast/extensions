import { existsSync } from "node:fs";
import type { QuickShellSettings } from "./schema";
import type { LaunchPlan, LaunchPlanEntry } from "./windows-launch";

export type MacTerminalHostId = "terminal" | "iterm";

export type MacLaunchInvocation = {
  executable: string;
  args: string[];
  displayName: string;
};

type MacLaunchEntryGroup = {
  hostId: MacTerminalHostId;
  entries: LaunchPlanEntry[];
};

const TERMINAL_APP_CANDIDATES = ["/System/Applications/Utilities/Terminal.app", "/Applications/Utilities/Terminal.app"];
const ITERM_APP_CANDIDATES = ["/Applications/iTerm.app", "/Applications/iTerm2.app"];

/**
 * Normalize a workspace/settings terminal id to a Mac host.
 * Windows-shaped values (wt, cmd, wsl, …) map to the Mac default.
 */
export function resolveMacTerminalHostId(
  terminal: string | null | undefined,
  settings: QuickShellSettings,
): MacTerminalHostId {
  const trimmed = (terminal ?? "").trim().toLowerCase();
  if (trimmed === "iterm" || trimmed === "iterm2") {
    return "iterm";
  }
  if (trimmed === "terminal") {
    return "terminal";
  }
  if (trimmed === "default" || trimmed === "" || trimmed === "same-as-previous") {
    return normalizeMacTerminalApplication(settings.terminalApplication);
  }
  // Windows hosts and unknowns → Mac default from settings.
  return normalizeMacTerminalApplication(settings.terminalApplication);
}

export function normalizeMacTerminalApplication(value: string | null | undefined): MacTerminalHostId {
  const trimmed = (value ?? "").trim().toLowerCase();
  if (trimmed === "iterm" || trimmed === "iterm2") {
    return "iterm";
  }
  // system / terminal / wt / conhost / it / anything else → Terminal.app
  return "terminal";
}

export function resolveMacAppName(hostId: MacTerminalHostId): { appName: string; displayName: string } {
  if (hostId === "iterm") {
    if (ITERM_APP_CANDIDATES.some((candidate) => existsSync(candidate))) {
      return { appName: existsSync("/Applications/iTerm.app") ? "iTerm" : "iTerm2", displayName: "iTerm2" };
    }
    return { appName: "Terminal", displayName: "Terminal (iTerm not found)" };
  }
  return { appName: "Terminal", displayName: "Terminal" };
}

export function shellQuoteForZsh(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildMacShellCommand(directory: string, command: string | null | undefined): string {
  const cd = `cd ${shellQuoteForZsh(directory)}`;
  const trimmed = command?.trim();
  if (!trimmed) {
    return cd;
  }
  return `${cd} && ${trimmed}`;
}

/**
 * Group Mac launches by terminal host. When `separateWindows` is false, compatible
 * entries share one Terminal.app / iTerm window as tabs. Elevation is ignored on Mac.
 */
export function groupMacLaunchEntries(
  entries: LaunchPlanEntry[],
  settings: QuickShellSettings,
  separateWindows: boolean,
): MacLaunchEntryGroup[] {
  if (separateWindows) {
    return entries.map((entry) => ({
      hostId: resolveMacTerminalHostId(entry.launch.terminal, settings),
      entries: [entry],
    }));
  }

  const groups: MacLaunchEntryGroup[] = [];
  const groupIndexByHost = new Map<MacTerminalHostId, number>();
  let previousHostId: MacTerminalHostId | undefined;

  for (const entry of entries) {
    const hostId =
      entry.launch.terminal?.trim().toLowerCase() === "same-as-previous" && previousHostId
        ? previousHostId
        : resolveMacTerminalHostId(entry.launch.terminal, settings);
    previousHostId = hostId;
    const existingIndex = groupIndexByHost.get(hostId);
    if (existingIndex !== undefined) {
      groups[existingIndex].entries.push(entry);
      continue;
    }
    groupIndexByHost.set(hostId, groups.length);
    groups.push({ hostId, entries: [entry] });
  }

  return groups;
}

/** Directory-only: `open -a App /path`. With command: osascript do-script / iTerm write text. */
export function buildMacLaunchInvocation(
  directory: string,
  command: string | null | undefined,
  hostId: MacTerminalHostId,
): MacLaunchInvocation {
  const { appName, displayName } = resolveMacAppName(hostId);
  const trimmedCommand = command?.trim();

  if (!trimmedCommand) {
    return {
      executable: "open",
      args: ["-a", appName, directory],
      displayName,
    };
  }

  const shellCommand = buildMacShellCommand(directory, trimmedCommand);

  if (appName === "iTerm" || appName === "iTerm2") {
    const script = [
      'tell application "iTerm"',
      "  create window with default profile",
      `  tell current session of current window to write text ${appleScriptString(shellCommand)}`,
      "end tell",
    ].join("\n");
    return {
      executable: "osascript",
      args: ["-e", script],
      displayName,
    };
  }

  const script = `tell application "Terminal" to do script ${appleScriptString(shellCommand)}`;
  return {
    executable: "osascript",
    args: ["-e", script],
    displayName,
  };
}

/** One window with tabs for multiple entries sharing a Mac terminal host. */
export function buildMacTabbedLaunchInvocation(
  entries: LaunchPlanEntry[],
  hostId: MacTerminalHostId,
): MacLaunchInvocation {
  if (entries.length === 0) {
    throw new Error("Mac tabbed launch requires at least one entry.");
  }
  if (entries.length === 1) {
    return buildMacLaunchInvocation(entries[0].directory, entries[0].command, hostId);
  }

  const { appName, displayName } = resolveMacAppName(hostId);
  const shellCommands = entries.map((entry) => buildMacShellCommand(entry.directory, entry.command));

  if (appName === "iTerm" || appName === "iTerm2") {
    const lines = ['tell application "iTerm"', "  activate", "  create window with default profile"];
    lines.push(`  tell current session of current window to write text ${appleScriptString(shellCommands[0])}`);
    for (let index = 1; index < shellCommands.length; index += 1) {
      lines.push("  tell current window");
      lines.push("    create tab with default profile");
      lines.push(`    tell current session to write text ${appleScriptString(shellCommands[index])}`);
      lines.push("  end tell");
    }
    lines.push("end tell");
    return {
      executable: "osascript",
      args: ["-e", lines.join("\n")],
      displayName,
    };
  }

  const lines = ['tell application "Terminal"', "  activate"];
  lines.push(`  do script ${appleScriptString(shellCommands[0])}`);
  for (let index = 1; index < shellCommands.length; index += 1) {
    lines.push(`  do script ${appleScriptString(shellCommands[index])} in front window`);
  }
  lines.push("end tell");
  return {
    executable: "osascript",
    args: ["-e", lines.join("\n")],
    displayName,
  };
}

export function buildMacLaunchInvocations(plan: LaunchPlan, settings: QuickShellSettings): MacLaunchInvocation[] {
  const separateWindows = settings.multiLaunchPresentation === "separateWindows";
  const groups = groupMacLaunchEntries(plan.entries, settings, separateWindows);
  return groups.map((group) => buildMacTabbedLaunchInvocation(group.entries, group.hostId));
}

export function buildMacLaunchInvocationForEntry(
  entry: LaunchPlanEntry,
  settings: QuickShellSettings,
): MacLaunchInvocation {
  const hostId = resolveMacTerminalHostId(entry.launch.terminal, settings);
  return buildMacLaunchInvocation(entry.directory, entry.command, hostId);
}

function appleScriptString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** True when Terminal.app appears installed (always on macOS; used by catalog/health). */
export function macTerminalAppExists(): boolean {
  return TERMINAL_APP_CANDIDATES.some((candidate) => existsSync(candidate)) || process.platform === "darwin";
}

export function macITermAppExists(): boolean {
  return ITERM_APP_CANDIDATES.some((candidate) => existsSync(candidate));
}
