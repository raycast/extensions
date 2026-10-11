import { existsSync } from "node:fs";
import net from "node:net";
import type { QuickShellSettings, Workspace } from "./schema";
import { macITermAppExists, macTerminalAppExists } from "./mac-launch";
import { isMacPlatform, isSupportedPlatform, isWindowsPlatform } from "./platform";
import { terminalHostExecutableExists } from "./terminal-catalog";
import { isAbsoluteDirectory, normalizeLaunches, validateWorkspace } from "./validation";
import { resolveLaunchTarget, validateLaunchPlanErrors } from "./windows-launch";

export type WorkspaceHealthIssue = {
  code: string;
  message: string;
  severity?: "error" | "warning";
};

export type WorkspaceHealthReport = {
  ok: boolean;
  issues: WorkspaceHealthIssue[];
};

export type PortInUseProbe = (port: number) => boolean;

/** Aligns with Core CommandPortRegex: localhost:, --port, -p, or =digits. */
const COMMAND_PORT_REGEX = /(?:localhost:|--port\s+|-p\s+|=)(\d{2,5})/gi;

/** Restricts filesystem probes to local paths; UNC/device paths are never probed. */
function isLocalCompanionPath(path: string): boolean {
  if (/^[a-zA-Z]:[\\/]/.test(path) && !path.startsWith("\\\\")) {
    return true;
  }
  // POSIX absolute (macOS companions under /Applications, /usr, etc.).
  return path.startsWith("/") && !path.startsWith("//");
}

export function assessWorkspaceHealthForList(
  workspace: Workspace,
  settings: QuickShellSettings,
  options?: { isPortInUse?: PortInUseProbe },
): WorkspaceHealthReport {
  return assessWorkspaceHealth(workspace, settings, {
    includeLaunchPlan: false,
    includeDirectoryExists: true,
    isPortInUse: options?.isPortInUse,
  });
}

export function assessWorkspaceHealthForLaunch(
  workspace: Workspace,
  settings: QuickShellSettings,
  options?: { isPortInUse?: PortInUseProbe },
): WorkspaceHealthReport {
  return assessWorkspaceHealth(workspace, settings, {
    includeLaunchPlan: true,
    includeDirectoryExists: true,
    isPortInUse: options?.isPortInUse,
  });
}

export function assessWorkspaceHealth(
  workspace: Workspace,
  settings: QuickShellSettings,
  options?: {
    includeLaunchPlan?: boolean;
    includeDirectoryExists?: boolean;
    isPortInUse?: PortInUseProbe;
  },
): WorkspaceHealthReport {
  const includeLaunchPlan = options?.includeLaunchPlan ?? true;
  const includeDirectoryExists = options?.includeDirectoryExists ?? true;
  const issues: WorkspaceHealthIssue[] = [];

  const validation = validateWorkspace(workspace);
  if (!validation.ok) {
    issues.push({ code: "validation", message: validation.message, severity: "error" });
  }

  const directory = workspace.directory.trim();
  if (directory && !isAbsoluteDirectory(directory)) {
    issues.push({ code: "directory_relative", message: "Directory must be an absolute path.", severity: "error" });
  }

  const lowerDirectory = directory.toLowerCase();
  const isWslUnc = lowerDirectory.startsWith("\\\\wsl$\\") || lowerDirectory.startsWith("\\\\wsl.localhost\\");
  if (isWslUnc) {
    issues.push({
      code: "wsl_directory",
      message: "WSL UNC directories can launch terminals but cannot be opened as Windows folders.",
      severity: "warning",
    });
  }

  if (
    includeDirectoryExists &&
    directory &&
    (isWindowsPlatform() || isMacPlatform()) &&
    !isWslUnc &&
    !existsSync(directory)
  ) {
    issues.push({ code: "directory_missing", message: `Directory not found: ${directory}`, severity: "error" });
  }

  if (includeLaunchPlan) {
    for (const error of validateLaunchPlanErrors(workspace)) {
      issues.push({ code: "launch_plan", message: error, severity: "error" });
    }
  }

  if (isWindowsPlatform()) {
    const launches = normalizeLaunches(workspace.launches, workspace).filter((entry) => entry.isEnabled);
    const seenHosts = new Set<string>();
    for (const launch of launches) {
      const target = resolveLaunchTarget(launch.terminal || workspace.terminal || "default", launch.wtProfile);
      const hostKey = target.hostExecutable.toLowerCase();
      if (seenHosts.has(hostKey)) {
        continue;
      }
      seenHosts.add(hostKey);
      if (!terminalHostExecutableExists(target.hostExecutable)) {
        issues.push({
          code: "terminal_missing",
          message: `Terminal host not found: ${target.hostExecutable} (${target.displayName}).`,
          severity: "error",
        });
      }
    }

    if (settings.terminalApplication === "wt" && !terminalHostExecutableExists("wt.exe")) {
      issues.push({
        code: "preferred_terminal_missing",
        message: "Preferred terminal Windows Terminal (wt.exe) was not found on PATH.",
        severity: "warning",
      });
    } else if (settings.terminalApplication === "it" && !terminalHostExecutableExists("wtai.exe")) {
      issues.push({
        code: "preferred_terminal_missing",
        message: "Preferred terminal Intelligent Terminal (wtai.exe) was not found on PATH.",
        severity: "warning",
      });
    }

    appendCompanionMissingIssues(workspace, issues);
  } else if (isMacPlatform()) {
    if (
      (settings.terminalApplication === "terminal" || settings.terminalApplication === "system") &&
      !macTerminalAppExists()
    ) {
      issues.push({
        code: "preferred_terminal_missing",
        message: "Preferred terminal Terminal.app was not found.",
        severity: "warning",
      });
    } else if (settings.terminalApplication === "iterm" && !macITermAppExists()) {
      issues.push({
        code: "preferred_terminal_missing",
        message: "Preferred terminal iTerm2 was not found in /Applications.",
        severity: "warning",
      });
    }

    appendCompanionMissingIssues(workspace, issues);
  }

  const portProbe = options?.isPortInUse ?? defaultPortInUseProbe;
  for (const port of collectCandidatePorts(workspace)) {
    if (!portProbe(port)) {
      continue;
    }
    if (!shouldTreatPortAsRunningSignal(workspace, port)) {
      continue;
    }
    issues.push({
      code: "port_in_use",
      message: `Port ${port} is already in use. The dev server may already be running.`,
      severity: "warning",
    });
  }

  if (!isSupportedPlatform()) {
    issues.push({
      code: "platform",
      message: "Terminal launch requires Windows or macOS. You can still edit workspaces on this machine.",
      severity: "error",
    });
  }

  const blocking = issues.filter((issue) => issue.severity !== "warning");
  return { ok: blocking.length === 0, issues };
}

function appendCompanionMissingIssues(workspace: Workspace, issues: WorkspaceHealthIssue[]): void {
  let openCompanionPaths = (workspace.companionApps ?? [])
    .filter((entry) => entry.openOnLaunch && entry.path?.trim())
    .map((entry) => entry.path.trim());
  if (openCompanionPaths.length === 0 && workspace.openCompanionAppOnLaunch && workspace.companionAppPath?.trim()) {
    openCompanionPaths = [workspace.companionAppPath.trim()];
  }

  for (const companionPath of openCompanionPaths) {
    if (isLocalCompanionPath(companionPath) && !existsSync(companionPath)) {
      issues.push({
        code: "companion_missing",
        message: `Companion app not found: ${companionPath}`,
        severity: "warning",
      });
    }
  }
}

/** Extract loopback URL ports and command ports from enabled launches. */
export function collectCandidatePorts(workspace: Workspace): number[] {
  const ports = new Set<number>();

  const urlPort = loopbackUrlPort(workspace.devServerUrl?.trim());
  if (urlPort !== null) {
    ports.add(urlPort);
  }

  for (const command of enabledLaunchCommands(workspace)) {
    for (const port of portsFromCommand(command)) {
      ports.add(port);
    }
  }

  return [...ports];
}

export function shouldTreatPortAsRunningSignal(workspace: Workspace, port: number): boolean {
  if (workspace.openDevServerOnLaunch) {
    const urlPort = loopbackUrlPort(workspace.devServerUrl?.trim());
    if (urlPort === port) {
      return true;
    }
  }

  for (const command of enabledLaunchCommands(workspace)) {
    if (portsFromCommand(command).includes(port)) {
      return true;
    }
  }

  return false;
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function loopbackUrlPort(url: string | undefined): number | null {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (!LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) {
      return null;
    }
    if (parsed.port) {
      const port = Number.parseInt(parsed.port, 10);
      return port > 0 && port <= 65535 ? port : null;
    }
    return parsed.protocol === "https:" ? 443 : 80;
  } catch {
    return null;
  }
}

function enabledLaunchCommands(workspace: Workspace): string[] {
  return normalizeLaunches(workspace.launches, workspace)
    .filter((entry) => entry.isEnabled)
    .map((entry) => entry.command ?? "");
}

function portsFromCommand(command: string): number[] {
  const ports: number[] = [];
  for (const match of command.matchAll(COMMAND_PORT_REGEX)) {
    const port = Number.parseInt(match[1], 10);
    if (port > 0 && port <= 65535) {
      ports.push(port);
    }
  }
  return ports;
}

/** Probe loopback bind; true when the port appears occupied. */
export function probePortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => {
      server.close(() => resolve(false));
    });
    server.listen(port, "127.0.0.1");
  });
}

function defaultPortInUseProbe(): boolean {
  // Sync assessment skips live probes (list path stays cheap). Launch can pass an injected probe.
  return false;
}

export async function assessWorkspaceHealthWithPortProbe(
  workspace: Workspace,
  settings: QuickShellSettings,
  options?: { includeLaunchPlan?: boolean; includeDirectoryExists?: boolean },
): Promise<WorkspaceHealthReport> {
  const candidates = collectCandidatePorts(workspace);
  const inUse = new Set<number>();
  for (const port of candidates) {
    if (await probePortInUse(port)) {
      inUse.add(port);
    }
  }
  return assessWorkspaceHealth(workspace, settings, {
    ...options,
    isPortInUse: (port) => inUse.has(port),
  });
}

export function formatHealthIssues(issues: WorkspaceHealthIssue[]): string {
  return issues.map((issue) => issue.message).join(" ");
}

export function primaryHealthIssue(issues: WorkspaceHealthIssue[]): string | undefined {
  return issues[0]?.message;
}
