import { getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** One pool, exactly as `runpool status --json` reports it. */
export interface Pool {
  name: string;
  scope: "org" | "repo";
  /** The GitHub org or `owner/repo` this pool is registered against. */
  target: string;
  /** How many runners the pool is configured to have. */
  count: number;
  /** How many of those are currently started. */
  running: number;
  /** Jobs in flight on this pool right now. */
  busy: number;
  /** Null when the GitHub query was skipped or unreachable. */
  github_registered: number | null;
  github_online: number | null;
  /** Repositories an org pool watches. Empty for a repo-scoped pool. */
  watch: string[];
}

export interface Status {
  paused: boolean;
  /** True when the GitHub query was skipped, so the github_* fields are null. */
  local: boolean;
  paths: { base: string; log: string; log_dir: string; telemetry: string };
  pools: Pool[];
}

/** Thrown when the executable cannot be found, so callers can show install help. */
export class RunpoolNotFoundError extends Error {
  constructor() {
    super("runpool is not installed, or is not where this extension looked for it.");
    this.name = "RunpoolNotFoundError";
  }
}

// A Raycast command does not inherit an interactive shell, so PATH is minimal
// and `runpool` alone will usually not resolve. Look in tiers: what the user
// told us, then what the system says, then the two places it actually installs
// to. Resolved once per command launch.
const CANDIDATE_PATHS = [`${homedir()}/.local/bin/runpool`, "/opt/homebrew/bin/runpool", "/usr/local/bin/runpool"];

let cachedPath: string | null | undefined;

function resolve(): string | null {
  const { runpoolPath } = getPreferenceValues<Preferences>();
  if (runpoolPath && runpoolPath.trim().length > 0) {
    const explicit = runpoolPath.trim();
    return existsSync(explicit) ? explicit : null;
  }
  return CANDIDATE_PATHS.find((p) => existsSync(p)) ?? null;
}

export function findRunpool(): string | null {
  if (cachedPath === undefined) cachedPath = resolve();
  return cachedPath;
}

/** Absolute path to the executable, or throw so the caller can offer install help. */
export function requireRunpool(): string {
  const bin = findRunpool();
  if (!bin) throw new RunpoolNotFoundError();
  return bin;
}

/**
 * Run runpool and return stdout.
 *
 * PATH is set explicitly because runpool shells out to `gh`, which lives in a
 * Homebrew directory that a Raycast command's environment does not include.
 * Without it every GitHub-touching command fails with a bare "missing
 * dependency: gh".
 */
export async function runpool(args: string[], signal?: AbortSignal): Promise<string> {
  const bin = requireRunpool();
  const { stdout } = await execFileAsync(bin, args, {
    signal,
    env: {
      ...process.env,
      PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH ?? ""}`,
    },
    maxBuffer: 4 * 1024 * 1024,
  });
  return stdout;
}

/**
 * Read pool status.
 *
 * `local` skips the GitHub query, leaving `github_registered` and
 * `github_online` null. Anything on a timer must use it: one API call per pool
 * per minute is thousands a day, and it makes the readout fail whenever the
 * network does.
 */
export async function getStatus(options?: { local?: boolean; signal?: AbortSignal }): Promise<Status> {
  const args = ["status", "--json"];
  if (options?.local) args.push("--local");
  return JSON.parse(await runpool(args, options?.signal)) as Status;
}

/** A pool is resting rather than broken when it has no runners up. */
export function isResting(pool: Pool): boolean {
  return pool.running === 0;
}

/**
 * Registrations GitHub has pruned after a long idle spell. The local install is
 * untouched and looks healthy, but jobs queue against it forever. This is the
 * one failure worth surfacing prominently.
 */
export function isUnreachable(pool: Pool): boolean {
  if (pool.github_registered === null) return false;
  if (pool.github_registered === 0) return true;
  return pool.running > 0 && pool.github_online === 0;
}

/** One line summarising the whole machine, for a command subtitle or a HUD. */
export function summarise(status: Status): string {
  if (status.paused) return "Paused";
  const running = status.pools.reduce((n, p) => n + p.running, 0);
  const busy = status.pools.reduce((n, p) => n + p.busy, 0);
  if (running === 0) return "Resting";
  if (busy > 0) return `${busy} building, ${running} ${running === 1 ? "runner" : "runners"} up`;
  return `${running} ${running === 1 ? "runner" : "runners"} up, idle`;
}
