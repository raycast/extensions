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

export interface Machine {
  /** One-minute load average: processes running or waiting for a CPU. */
  load: number;
  cores: number;
  /** The contention threshold runpool itself warns above. */
  load_warn: number;
}

export interface Status {
  paused: boolean;
  /** True when the GitHub query was skipped, so the github_* fields are null. */
  local: boolean;
  machine: Machine;
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
function requireRunpool(): string {
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

/**
 * The state words are GitHub's own, as shown on its runners settings page:
 * Active, Idle, Offline. Matching them means anyone who has looked at that
 * page already knows what these mean.
 *
 * The one thing to hold in mind is that Offline here is normal. GitHub uses it
 * for a runner that is not connected, which for an on-demand pool is most of
 * the time and is not a fault. The UI styles it neutrally for that reason.
 */
export type PoolState = "active" | "idle" | "offline" | "paused" | "unreachable";

export function poolState(pool: Pool, paused: boolean): PoolState {
  if (paused) return "paused";
  if (isUnreachable(pool)) return "unreachable";
  if (pool.busy > 0) return "active";
  if (pool.running > 0) return "idle";
  return "offline";
}

export function stateLabel(pool: Pool, paused: boolean): string {
  switch (poolState(pool, paused)) {
    case "paused":
      return "Paused";
    case "unreachable":
      return "Unreachable";
    case "active":
      return "Active";
    case "idle":
      return "Idle";
    case "offline":
      return "Offline";
  }
}

/**
 * Jobs running out of total runner slots, as `2/4`.
 *
 * One number, one meaning, everywhere. Jobs is the figure worth showing
 * because `busy` is always at most `running`, which is always at most `count`:
 * an awake but idle runner is a polling process costing nothing, while a
 * running job is what actually consumes the machine.
 *
 * The cost is that idle and offline both read `0/4`. That is correct for a
 * glance — both mean nothing is happening — and the list carries a state tag
 * for the times the difference matters.
 */
export function fraction(pool: Pool): string {
  return `${pool.busy}/${pool.count}`;
}

/**
 * The fill variant for a given proportion of work, rounded to the nearest
 * quarter. Assets exist at 0, 25, 50, 75 and 100, plus `bar-off` for disabled.
 *
 * Always driven by the same figure as `fraction`, so the icon and the text can
 * never contradict each other. An earlier version filled by runners awake,
 * which put a full pool next to the word "Idle".
 */
export function fillAsset(busy: number, total: number): string {
  const level = total === 0 ? 0 : busy / total;
  const step = Math.round(Math.min(1, Math.max(0, level)) * 4) * 25;
  return `bar-${step}.png`;
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

/** One line summarising the whole machine, for a command subtitle. */
export function summarise(status: Status): string {
  if (status.paused) return "Paused";
  const running = status.pools.reduce((n, p) => n + p.running, 0);
  const busy = status.pools.reduce((n, p) => n + p.busy, 0);
  const slots = status.pools.reduce((n, p) => n + p.count, 0);
  if (busy > 0) return `Active ${busy}/${slots}`;
  if (running === 0) return "Offline";
  return "Idle";
}

/**
 * Load average against core count.
 *
 * Both numbers, spelled out, because neither means anything alone: 38.9 is
 * unreadable without knowing the machine, and a bare core count is a fact
 * nobody needs. Written as prose rather than a fraction on purpose, since a
 * fraction implies the numerator cannot exceed the denominator and load
 * routinely does.
 */
export function loadLabel(machine: Machine): string {
  return `Load ${machine.load.toFixed(1)} across ${machine.cores} cores`;
}

/**
 * The GitHub avatar of whoever owns the pool: the organisation, or the user
 * who owns the repository. Far more legible in a list than a generic glyph,
 * and it makes the org-versus-personal distinction visible without a word of
 * explanation.
 */
export function ownerAvatar(pool: Pool): string {
  const owner = pool.scope === "org" ? pool.target : pool.target.split("/")[0];
  return `https://github.com/${owner}.png?size=128`;
}
