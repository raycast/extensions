import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { promisify } from "node:util";

const executeFile = promisify(execFile);

export type DaemonState = "running" | "starting" | "stopped" | "unhealthy";

export type ContainerSummary = {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
};

export type ControlSnapshot = {
  schemaVersion: number;
  capturedAt: string;
  daemon: {
    state: DaemonState;
    healthy: boolean;
    managed: boolean;
    socketPath: string;
    socketExists: boolean;
    socketReachable: boolean;
    virtualMachineHealth?: "healthy" | "unhealthy" | "starting";
    version?: string;
    apiVersion?: string;
    gitCommit?: string;
    buildTime?: string;
    message?: string;
  };
  containers: ContainerSummary[];
  diagnostics: {
    ownership: "managed-launch-agent" | "unmanaged" | "none";
    installation: {
      kind: "package" | "homebrew" | "local-build" | "other" | "not-found";
      executablePath?: string;
    };
    paths: {
      socket: string;
      logDirectory: string;
      standardOutputLog: string;
      standardErrorLog: string;
      launchAgent: string;
      controlLock: string;
      defaultEngineStateDirectory: string;
    };
    diskSpace?: {
      volumePath: string;
      availableBytes: number;
      totalBytes: number;
      level: "normal" | "low" | "critical";
    };
  };
};

export type SupportReport = {
  schemaVersion: number;
  generatedAt: string;
  snapshot: ControlSnapshot;
  recentLogs: LogOutput[];
  text: string;
};

export type ActionResult = {
  succeeded: boolean;
  message: string;
};

export type LogOutput = {
  source: string;
  text: string;
  truncated: boolean;
  byteCount: number;
};

export async function loadSnapshot(): Promise<ControlSnapshot> {
  return runControl<ControlSnapshot>(["status", "--json"]);
}

export async function runAction(arguments_: string[]): Promise<ActionResult> {
  return runControl<ActionResult>([...arguments_, "--json"]);
}

export async function loadDaemonLogs(): Promise<LogOutput[]> {
  return runControl<LogOutput[]>(["logs", "daemon", "--json"]);
}

export async function loadSupportReport(): Promise<SupportReport> {
  return runControl<SupportReport>(["support-report", "--json"]);
}

export async function loadContainerLogs(
  identifier: string,
): Promise<LogOutput> {
  return runControl<LogOutput>(["logs", "container", identifier, "--json"]);
}

async function runControl<T>(arguments_: string[]): Promise<T> {
  const executable = await resolveControlExecutable();
  try {
    const { stdout } = await executeFile(executable, arguments_, {
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
      timeout: 15_000,
    });
    return JSON.parse(stdout) as T;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`glassdockctl failed: ${detail}`);
  }
}

async function resolveControlExecutable(): Promise<string> {
  const preference =
    getPreferenceValues<Preferences>().controlExecutable?.trim();
  const candidates = [
    preference,
    "/opt/glassdock/bin/glassdockctl",
    "/opt/homebrew/bin/glassdockctl",
    "/usr/local/bin/glassdockctl",
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (!candidate.startsWith("/")) continue;
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next fixed location.
    }
  }

  throw new Error(
    "glassdockctl was not found. Install Glass Dock or set its absolute path in the extension preferences.",
  );
}
