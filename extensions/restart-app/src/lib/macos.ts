import { OPEN_PATH, execFileRunner, runJxa } from "./exec.ts";
import type { ExecFileRunner } from "./exec.ts";
import { LIST_APPS_SCRIPT, TERMINATE_APP_SCRIPT } from "./jxa.ts";
import type { RestartDeps, TerminateOutcome } from "./restart.ts";
import type { RawRunningApp, RestartMode, RestartableApp } from "./types.ts";

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Validates the JSON printed by LIST_APPS_SCRIPT, dropping malformed entries. */
export function parseRunningApps(json: string): RawRunningApp[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("Unexpected running app snapshot from osascript");
  const apps: RawRunningApp[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.pid !== "number" || typeof record.activationPolicy !== "number") continue;
    apps.push({
      pid: record.pid,
      name: asStringOrNull(record.name),
      bundleId: asStringOrNull(record.bundleId),
      bundlePath: asStringOrNull(record.bundlePath),
      executablePath: asStringOrNull(record.executablePath),
      activationPolicy: record.activationPolicy,
      terminated: record.terminated === true,
    });
  }
  return apps;
}

export function parseTerminateOutcome(json: string): TerminateOutcome {
  const parsed: unknown = JSON.parse(json);
  const record = (typeof parsed === "object" && parsed !== null ? parsed : {}) as Record<string, unknown>;
  const detail = typeof record.detail === "string" ? record.detail : undefined;
  switch (record.status) {
    case "requested":
      return { status: "requested" };
    case "refused":
      return { status: "refused" };
    case "stale":
      return { status: "stale", detail: detail ?? "the selected process changed" };
    default:
      throw new Error(`Unexpected terminate response: ${json}`);
  }
}

/** Builds the argument vector for /usr/bin/open that launches the exact bundle. */
export function openArguments(bundlePath: string, newInstance: boolean): string[] {
  return newInstance ? ["-n", "-a", bundlePath] : ["-a", bundlePath];
}

/** `kill(pid, 0)` probe: ESRCH means the process is gone, EPERM means it exists. */
export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export async function listRunningApps(exec: ExecFileRunner = execFileRunner): Promise<RawRunningApp[]> {
  return parseRunningApps(await runJxa(LIST_APPS_SCRIPT, [], exec));
}

export async function terminateApp(
  app: RestartableApp,
  mode: RestartMode,
  exec: ExecFileRunner = execFileRunner,
): Promise<TerminateOutcome> {
  const output = await runJxa(TERMINATE_APP_SCRIPT, [String(app.pid), app.bundlePath, app.executablePath, mode], exec);
  return parseTerminateOutcome(output);
}

export async function openBundle(
  bundlePath: string,
  newInstance: boolean,
  exec: ExecFileRunner = execFileRunner,
): Promise<void> {
  await exec(OPEN_PATH, openArguments(bundlePath, newInstance), { timeoutMs: 30_000 });
}

export function createMacosDeps(exec: ExecFileRunner = execFileRunner): RestartDeps {
  return {
    terminate: (app, mode) => terminateApp(app, mode, exec),
    isRunning: async (pid) => isProcessRunning(pid),
    listRunning: () => listRunningApps(exec),
    open: (bundlePath, options) => openBundle(bundlePath, options.newInstance, exec),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
  };
}
