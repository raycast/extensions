import { existsSync } from "node:fs";
import type { QuickShellSettings } from "./schema";
import type { LaunchPlan, LaunchPlanEntry } from "./windows-launch";

export type MacTerminalHostId = "terminal" | "iterm";

export type MacLaunchInvocation = {
  executable: string;
  args: string[];
  displayName: string;
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

export function buildMacLaunchInvocations(plan: LaunchPlan, settings: QuickShellSettings): MacLaunchInvocation[] {
  return plan.entries.map((entry) => buildMacLaunchInvocationForEntry(entry, settings));
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
