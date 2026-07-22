import type { LaunchEntry, QuickShellSettings, Workspace } from "./schema";
import { isMacPlatform } from "./platform";
import { normalizeTerminalApplicationForPlatform } from "./terminal-options";

export type LaunchTargetKind = "wt" | "powershell" | "pwsh" | "cmd" | "wsl";

export type ResolvedLaunchTarget = {
  kind: LaunchTargetKind;
  hostExecutable: string;
  profileOrDistro?: string | null;
  displayName: string;
};

export type LaunchPlanEntry = {
  workspace: Workspace;
  launch: LaunchEntry;
  target: ResolvedLaunchTarget;
  directory: string;
  command?: string | null;
  runAsAdmin: boolean;
};

export type LaunchPlan = {
  entries: LaunchPlanEntry[];
  groupedArguments: string[];
  errors: string[];
};

export type LaunchOptions = {
  runAsAdmin?: boolean;
  runAsStandard?: boolean;
};

export type WslUncLocation = {
  distro: string;
  linuxPath: string;
};

const PACKAGE_MANAGER_COMMANDS = new Set(["npm", "pnpm", "yarn", "bun", "npx", "dotnet", "cargo", "go"]);

export function buildSelectedLaunchWorkspace(
  workspace: Workspace,
  launchId: string,
  settings?: QuickShellSettings,
): Workspace | null {
  const selected = workspace.launches.find((launch) => launch.id === launchId);
  if (!selected?.isEnabled) {
    return null;
  }

  let selectedLaunch = { ...selected };
  if (settings) {
    let previousTerminal: string | undefined;
    let previousProfile: string | null | undefined;
    for (const launch of workspace.launches
      .filter((entry) => entry.isEnabled)
      .sort((left, right) => left.order - right.order)) {
      const resolved = resolveTerminalForLaunch(launch, settings, previousTerminal, previousProfile);
      if (launch.id === launchId) {
        selectedLaunch = { ...selected, terminal: resolved.terminal, wtProfile: resolved.wtProfile ?? null };
        break;
      }
      previousTerminal = resolved.terminal;
      previousProfile = resolved.wtProfile;
    }
  }

  return {
    ...workspace,
    terminal: selectedLaunch.terminal,
    wtProfile: selectedLaunch.wtProfile ?? null,
    command: selectedLaunch.command ?? null,
    launches: [selectedLaunch],
  };
}

export function parseWslUncPath(value: string): WslUncLocation | null {
  if (value !== value.trim() || value.length > 1024 || /[\r\n\0%]/.test(value)) {
    return null;
  }

  const match = /^\\\\wsl\$\\([a-zA-Z0-9][a-zA-Z0-9._-]*)(?:\\(.*))?$/i.exec(value);
  if (!match) {
    return null;
  }

  const segments = match[2] ? match[2].split("\\") : [];
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return null;
  }

  return {
    distro: match[1],
    linuxPath: segments.length > 0 ? `/${segments.join("/")}` : "/",
  };
}

export function resolveTerminalForLaunch(
  launch: LaunchEntry,
  settings: QuickShellSettings,
  previousTerminal?: string,
  previousProfile?: string | null,
): { terminal: string; wtProfile?: string | null } {
  if (launch.terminal === "same-as-previous") {
    if (previousTerminal) {
      return { terminal: previousTerminal, wtProfile: launch.wtProfile ?? previousProfile };
    }
    // No prior concrete target: same as Core ResolveEffectiveLaunchTargetId → default.
    return resolveTerminalForLaunch({ ...launch, terminal: "default" }, settings);
  }

  if (launch.terminal === "default") {
    const rawApp =
      settings.terminalApplication === "system" ? (isMacPlatform() ? "terminal" : "wt") : settings.terminalApplication;
    const terminalApp = normalizeTerminalApplicationForPlatform(rawApp);
    const profile = settings.defaultProfile === "__default__" ? null : settings.defaultProfile;
    if (terminalApp === "conhost") {
      return { terminal: resolveConhostTerminal(profile), wtProfile: null };
    }
    if (terminalApp === "it") {
      return { terminal: "it", wtProfile: profile };
    }
    if (terminalApp === "terminal" || terminalApp === "iterm") {
      return { terminal: terminalApp, wtProfile: null };
    }
    return { terminal: terminalApp, wtProfile: profile };
  }

  return { terminal: launch.terminal, wtProfile: launch.wtProfile };
}

function resolveConhostTerminal(profile: string | null | undefined): string {
  switch ((profile ?? "powershell").toLowerCase()) {
    case "cmd":
      return "cmd";
    case "pwsh":
      return "pwsh";
    default:
      return "powershell";
  }
}

export function resolveLaunchTarget(terminal: string, wtProfile?: string | null): ResolvedLaunchTarget {
  switch (terminal) {
    case "wt":
      return {
        kind: "wt",
        hostExecutable: "wt.exe",
        profileOrDistro: wtProfile,
        displayName: wtProfile ? `Windows Terminal (${wtProfile})` : "Windows Terminal",
      };
    case "it":
      return {
        kind: "wt",
        hostExecutable: "wtai.exe",
        profileOrDistro: wtProfile,
        displayName: wtProfile ? `Intelligent Terminal (${wtProfile})` : "Intelligent Terminal",
      };
    case "powershell":
      return {
        kind: "powershell",
        hostExecutable: "powershell.exe",
        displayName: "Windows PowerShell",
      };
    case "pwsh":
      return {
        kind: "pwsh",
        hostExecutable: "pwsh.exe",
        displayName: "PowerShell",
      };
    case "cmd":
      return {
        kind: "cmd",
        hostExecutable: "cmd.exe",
        displayName: "Command Prompt",
      };
    case "wsl":
      return {
        kind: "wsl",
        hostExecutable: "wsl.exe",
        profileOrDistro: wtProfile,
        displayName: wtProfile ? `WSL (${wtProfile})` : "WSL",
      };
    default:
      return {
        kind: "wt",
        hostExecutable: "wt.exe",
        profileOrDistro: wtProfile,
        displayName: "Windows Terminal",
      };
  }
}

export function escapeWindowsArgument(value: string): string {
  if (!/[ \t"]/.test(value)) {
    return value;
  }
  // Follows CommandLineToArgvW escaping rules: backslashes only need doubling
  // when they immediately precede a quote (embedded or the closing one).
  let result = '"';
  let backslashes = 0;
  for (const ch of value) {
    if (ch === "\\") {
      backslashes++;
      continue;
    }
    if (ch === '"') {
      result += "\\".repeat(backslashes * 2 + 1) + '"';
      backslashes = 0;
      continue;
    }
    result += "\\".repeat(backslashes) + ch;
    backslashes = 0;
  }
  result += "\\".repeat(backslashes * 2) + '"';
  return result;
}

export function buildSetLocationCommand(directory: string): string {
  const normalized = directory.replace(/'/g, "''");
  return `Set-Location -LiteralPath '${normalized}'`;
}

export function buildCmdChangeDirectory(directory: string): string {
  return `cd /d ${escapeWindowsArgument(directory)}`;
}

export function buildWindowsTerminalCmdSuffix(directory: string, command: string): string {
  return `${buildCmdChangeDirectory(directory)} && ${command}`;
}

export function buildLaunchArguments(entry: LaunchPlanEntry): string[] {
  const args: string[] = [];
  const { target, directory, command } = entry;

  if (target.kind === "wt") {
    if (target.profileOrDistro) {
      args.push("-p", target.profileOrDistro);
    }
    args.push("-d", directory);
    if (command) {
      args.push(command);
    }
    return args;
  }

  if (target.kind === "wsl") {
    const wslLocation = parseWslUncPath(directory);
    const distro = target.profileOrDistro ?? wslLocation?.distro;
    const linuxDirectory = wslLocation?.linuxPath ?? directory;
    if (distro) {
      args.push("-d", distro);
    }
    const wslCommand = command
      ? `cd ${shellQuoteForBash(linuxDirectory)} && ${command}`
      : `cd ${shellQuoteForBash(linuxDirectory)} && exec $SHELL -l`;
    args.push("--", "bash", "-lc", wslCommand);
    return args;
  }

  if (target.kind === "cmd") {
    const cmdParts = [buildCmdChangeDirectory(directory)];
    if (command) {
      cmdParts.push("&&", command);
    }
    args.push("/k", cmdParts.join(" "));
    return args;
  }

  const psParts = [buildSetLocationCommand(directory)];
  if (command) {
    psParts.push("; " + command);
  }
  args.push("-NoExit", "-Command", psParts.join(""));
  return args;
}

function shellQuoteForBash(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function usesPackageManager(command: string): boolean {
  const firstToken = command.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return PACKAGE_MANAGER_COMMANDS.has(firstToken);
}

export function shouldRouteThroughCmd(command: string | null | undefined): boolean {
  if (!command) {
    return false;
  }
  return usesPackageManager(command);
}

export function validateLaunchPlanErrors(workspace: Workspace): string[] {
  const errors: string[] = [];
  const directory = workspace.directory.trim();
  if (!directory) {
    errors.push("Workspace directory is required.");
  }

  const enabledLaunches = workspace.launches.filter((launch) => launch.isEnabled);
  if (enabledLaunches.length === 0) {
    errors.push("No enabled launch entries.");
  }

  return errors;
}

export function buildWorkspaceLaunchPlan(
  workspace: Workspace,
  settings: QuickShellSettings,
  options: LaunchOptions = {},
): LaunchPlan {
  const errors = validateLaunchPlanErrors(workspace);
  const directory = workspace.directory.trim();

  const enabledLaunches = workspace.launches.filter((launch) => launch.isEnabled);
  const entries: LaunchPlanEntry[] = [];
  let previousTerminal: string | undefined;
  let previousProfile: string | null | undefined;

  for (const launch of enabledLaunches.sort((left, right) => left.order - right.order)) {
    const resolved = resolveTerminalForLaunch(launch, settings, previousTerminal, previousProfile);
    previousTerminal = resolved.terminal;
    previousProfile = resolved.wtProfile;
    const target = resolveLaunchTarget(resolved.terminal, resolved.wtProfile);
    const command = launch.command || null;
    const wantsAdmin = launch.runAsAdmin || workspace.runAsAdmin;
    const runAsAdmin = options.runAsStandard ? false : (options.runAsAdmin ?? wantsAdmin);

    entries.push({
      workspace,
      launch,
      target,
      directory,
      command,
      runAsAdmin,
    });
  }

  const groupedArguments = buildGroupedWindowsTerminalArguments(entries);

  return { entries, groupedArguments, errors };
}

function escapeCmd(value: string): string {
  return value.replace(/"/g, '""');
}

export function buildWindowsTerminalTabArguments(entry: LaunchPlanEntry): string[] {
  const { target, directory, command } = entry;

  if (target.kind === "wt") {
    return buildLaunchArguments(entry);
  }

  if (target.kind === "cmd") {
    const args = ["-d", directory];
    if (command) {
      args.push(`cmd.exe /k "${escapeCmd(command)}"`);
    } else {
      args.push("cmd.exe");
    }
    return args;
  }

  if (target.kind === "powershell" || target.kind === "pwsh") {
    const executable = target.kind === "pwsh" ? "pwsh.exe" : "powershell.exe";
    const args = ["-d", directory];
    if (command) {
      const escaped = command.replace(/`/g, "``").replace(/"/g, '`"');
      args.push(`${executable} -NoExit -Command "${escaped}"`);
    } else {
      args.push(executable);
    }
    return args;
  }

  if (target.kind === "wsl") {
    const wslLocation = parseWslUncPath(directory);
    const distro = target.profileOrDistro ?? wslLocation?.distro;
    const linuxDirectory = wslLocation?.linuxPath ?? directory;
    const wslCommand = command
      ? `cd ${shellQuoteForBash(linuxDirectory)} && ${command}`
      : `cd ${shellQuoteForBash(linuxDirectory)} && exec $SHELL -l`;
    const args = ["wsl.exe"];
    if (distro) {
      args.push("-d", distro);
    }
    args.push("-e", "bash", "-lc", wslCommand);
    return args;
  }

  return buildLaunchArguments(entry);
}

export function buildGroupedWindowsTerminalArguments(entries: LaunchPlanEntry[]): string[] {
  if (entries.length === 0) {
    return [];
  }

  const args: string[] = [];
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (index > 0) {
      args.push(";", "new-tab");
    }
    args.push(...buildWindowsTerminalTabArguments(entry));
  }
  return args;
}

export function formatLaunchPlanSummary(plan: LaunchPlan): string {
  if (plan.errors.length > 0) {
    return plan.errors.join(" ");
  }
  if (plan.entries.length === 0) {
    return "No launch entries.";
  }
  if (plan.entries.length === 1) {
    const entry = plan.entries[0];
    return `${entry.target.displayName} → ${entry.directory}`;
  }
  return `${plan.entries.length} launches in ${plan.entries[0].target.displayName}`;
}
