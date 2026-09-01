import { getPreferenceValues, Icon } from "@raycast/api";
import { execFile, execFileSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const COMMAND_ENV = {
  ...process.env,
  PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH ?? ""}`,
};

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
  /** Persistent per-pool pause state. Distinct from the global status flag. */
  paused: boolean;
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
  paths: { base: string; cache: string; log: string; log_dir: string; telemetry: string };
  pools: Pool[];
}

/** Thrown when the executable cannot be found, so callers can show install help. */
export class RunpoolNotFoundError extends Error {
  constructor() {
    super("runpool is not installed, or is not where this extension looked for it.");
    this.name = "RunpoolNotFoundError";
  }
}

/**
 * The GitHub CLI is missing or signed out.
 *
 * A distinct type rather than a message, because both are ordinary setup
 * states with a one-line remedy, and the views answer them with a screen
 * rather than an error string. Which of the two it is decides the remedy, so
 * it is carried on the error rather than re-derived by matching on prose.
 */
export class GitHubCliError extends Error {
  constructor(readonly reason: "missing" | "unauthenticated") {
    super(
      reason === "missing"
        ? "GitHub CLI (gh) is not installed, or is not on the path this extension searched."
        : "GitHub CLI is installed but not signed in to GitHub.",
    );
    this.name = "GitHubCliError";
  }
}

// A Raycast command does not inherit an interactive shell, so PATH is minimal
// and `runpool` alone will usually not resolve. Look where it actually
// installs to, after whatever the user told us.
const CANDIDATE_PATHS = [`${homedir()}/.local/bin/runpool`, "/opt/homebrew/bin/runpool", "/usr/local/bin/runpool"];

// The same problem for `gh`, which runpool itself requires and which this
// extension also calls directly for workflow history.
const GH_CANDIDATE_PATHS = ["/opt/homebrew/bin/gh", "/usr/local/bin/gh", "/usr/bin/gh"];

/**
 * Where the executable is, resolved on every call rather than memoised.
 *
 * Preference values are tied to the moment a command launched, and Raycast
 * makes no promise that changing them remounts a view command. Caching this
 * meant that correcting the path in preferences and pressing "Try Again" ran
 * the same broken executable until the command was relaunched, which is
 * precisely the moment it needs to work. A handful of `existsSync` calls are
 * not worth that.
 */
export function findRunpool(): string | null {
  const { runpoolPath } = getPreferenceValues<Preferences>();
  if (runpoolPath && runpoolPath.trim().length > 0) {
    const explicit = runpoolPath.trim();
    return existsSync(explicit) ? explicit : null;
  }
  return CANDIDATE_PATHS.find((p) => existsSync(p)) ?? null;
}

/** The oldest runpool this extension will drive. See `runpoolTooOld`. */
export const MINIMUM_RUNPOOL = "0.9.0";

const versionCache = new Map<string, string | null>();

/** Forget the probed versions, so a `Try Again` re-runs them. */
export function forgetRunpoolVersion(): void {
  versionCache.clear();
}

/**
 * Whether the resolved runpool is too old to guard a resize.
 *
 * `set-count --if-count` arrived in 0.9.0. Older versions do not reject the
 * flag, they ignore it: `_rp_set_count` reads two positional arguments and
 * never looks past them. So a resize that reads as guarded here is not one
 * there, and a pool changed from another window between the confirmation and
 * the write is shrunk by an action meant to grow it, deregistering runners
 * nobody agreed to. A silently ignored safety flag is worse than a missing
 * one, so this refuses rather than degrading.
 *
 * Probed once per resolved path and cached, because the hook that calls this
 * is synchronous and runs on every render. A version cannot change under a
 * running command, and `Try Again` clears the cache.
 */
export function runpoolTooOld(): string | null {
  const bin = findRunpool();
  if (!bin) return null;

  if (!versionCache.has(bin)) {
    let found: string | null = null;
    try {
      const out = execFileSync(bin, ["--version"], {
        env: COMMAND_ENV,
        encoding: "utf8",
        timeout: 2000,
      });
      found = /(\d+)\.(\d+)\.(\d+)/.exec(out)?.[0] ?? null;
    } catch {
      // Unreadable is not old. A binary that cannot answer --version has a
      // different problem, and every later call reports it properly.
      found = null;
    }
    versionCache.set(bin, found);
  }

  const version = versionCache.get(bin) ?? null;
  if (!version) return null;
  return compareVersions(version, MINIMUM_RUNPOOL) < 0 ? version : null;
}

/** -1, 0 or 1. Three numeric parts only, which is all runpool ever emits. */
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/**
 * Where the GitHub CLI is, or null.
 *
 * runpool requires an authenticated `gh` and so does this extension, but the
 * two fail differently: `runpool status` swallows a broken `gh` and reports
 * the GitHub fields as null, while a direct `gh api` call fails outright.
 * Resolved the same way as runpool, and for the same reason.
 */
export function findGh(): string | null {
  return GH_CANDIDATE_PATHS.find((p) => existsSync(p)) ?? null;
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
    env: COMMAND_ENV,
    maxBuffer: 4 * 1024 * 1024,
  });
  return stdout;
}

/**
 * Run GitHub CLI with the same PATH as runpool.
 *
 * The history view owns GitHub's workflow data, rather than extending runpool
 * beyond runner capacity. Keeping the process setup here means both commands
 * work from Raycast's deliberately minimal environment.
 */
export async function github(args: string[], signal?: AbortSignal): Promise<string> {
  const bin = findGh();
  if (!bin) throw new GitHubCliError("missing");

  try {
    const { stdout } = await execFileAsync(bin, args, {
      signal,
      env: COMMAND_ENV,
      maxBuffer: 4 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new GitHubCliError("missing");

    // Sign-in is checked here rather than up front. `gh auth status` validates
    // the token against the API, so pre-flighting it would add a network call
    // to every launch to learn what the first real request reports anyway.
    //
    // Two different messages, because there are two different failures. No
    // credentials at all gets gh's own "please run: gh auth login"; a token
    // that has expired or been revoked gets GitHub's "Bad credentials (HTTP
    // 401)" passed straight through. Matching only the first left the second
    // arriving as a raw API error, which is the state a token lands in on its
    // own after being set up correctly once.
    const stderr = (error as { stderr?: string } | null)?.stderr ?? "";
    if (/auth login|not logged|authentication|bad credentials|http 401/i.test(stderr)) {
      throw new GitHubCliError("unauthenticated");
    }
    throw error;
  }
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

export function poolState(pool: Pool, globallyPaused: boolean): PoolState {
  if (globallyPaused || pool.paused) return "paused";
  if (isUnreachable(pool)) return "unreachable";
  if (pool.busy > 0) return "active";
  if (pool.running > 0) return "idle";
  return "offline";
}

export function stateLabel(pool: Pool, globallyPaused: boolean): string {
  if (globallyPaused) return "Paused Globally";
  switch (poolState(pool, false)) {
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

// Built-in icons rather than bundled images, on purpose. A menu bar is drawn
// once per display and macOS takes the ink from the wallpaper behind each one,
// so on a second screen with a dark backdrop every native item turns white.
// Raycast redraws its own icons to match; a bundled PNG is a fixed bitmap and
// cannot, which left the mark black and invisible there. Tinting with
// `Color.PrimaryText` does not help either: it resolves to one colour for every
// display at once.
const FILL_STEPS = [
  Icon.Circle,
  Icon.CircleProgress25,
  Icon.CircleProgress50,
  Icon.CircleProgress75,
  Icon.CircleProgress100,
] as const;

/**
 * The fill variant for a given proportion of work, rounded to the nearest
 * quarter. Raycast ships an exact five-step set, so the buckets map one to one.
 *
 * Always driven by the same figure as `fraction`, so the icon and the text can
 * never contradict each other. An earlier version filled by runners awake,
 * which put a full pool next to the word "Idle".
 */
export function fillIcon(busy: number, total: number): Icon {
  if (total <= 0 || busy <= 0) return FILL_STEPS[0];
  if (busy >= total) return FILL_STEPS[FILL_STEPS.length - 1];
  // Empty and full are reserved for the two states they claim, because those
  // are the only readings that can be flatly wrong rather than approximate.
  // Nearest-quarter alone rounds 1 of 9 down to an empty mark and 8 of 9 up to
  // a full one, each of which says the opposite of what is happening.
  const step = Math.round((busy / total) * 4);
  return FILL_STEPS[Math.min(FILL_STEPS.length - 2, Math.max(1, step))];
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

/**
 * How many registrations GitHub holds beyond what a pool expects, or null.
 *
 * Only meaningful for a repository pool. An organisation scope counts every
 * runner in the organisation, including other pools and other machines, so a
 * number above this pool's count is entirely normal there and means nothing.
 * runpool draws the same distinction, in prose, where it reports the mismatch.
 *
 * Not a fault, and deliberately not styled as one. It is the lasting trace of
 * a shrink that removed runners locally but could not reach GitHub to
 * deregister them, which otherwise appears only as a toast at the time.
 */
export function surplusRegistrations(pool: Pool): number | null {
  if (pool.scope !== "repo" || pool.github_registered === null) return null;
  return pool.github_registered > pool.count ? pool.github_registered - pool.count : null;
}

/**
 * True when a read that should have asked GitHub came back without its answer.
 *
 * `runpool status` treats an unusable `gh` as "GitHub could not be asked" and
 * reports those fields as null rather than failing. That is right for the CLI
 * and quietly wrong here: `isUnreachable` can then never return true, so the
 * one state worth acting on stops being detected while every pool still reads
 * as healthy. The list says so rather than showing a reassuring lie.
 */
export function githubUnchecked(status: Status): boolean {
  return !status.local && status.pools.some((pool) => pool.github_registered === null);
}

/** One line summarising the whole machine, for a command subtitle. */
export function summarise(status: Status): string {
  if (status.paused) return "Paused";
  if (status.pools.length > 0 && status.pools.every((pool) => pool.paused)) return "Pools Paused";
  const running = status.pools.reduce((n, p) => n + p.running, 0);
  const busy = status.pools.reduce((n, p) => n + p.busy, 0);
  const slots = status.pools.reduce((n, p) => n + p.count, 0);
  if (busy > 0) return `Active ${busy}/${slots}`;
  if (running === 0) return "Offline";
  return "Idle";
}

/**
 * The useful half of a failed runpool invocation.
 *
 * A rejected `execFile` leads with "Command failed:" and the entire command
 * line, which buries the one line worth reading. runpool writes its own
 * complaint to stderr, so prefer that.
 */
export function errorMessage(error: unknown): string {
  const stderr = (error as { stderr?: string } | null)?.stderr?.trim();
  if (stderr) return stderr;
  return error instanceof Error ? error.message : String(error);
}

/**
 * The GitHub avatar of whoever owns the pool: the organisation, or the user
 * who owns the repository. Far more legible in a list than a generic glyph,
 * and it makes the org-versus-personal distinction visible without a word of
 * explanation.
 */
export function githubAvatar(owner: string): string {
  return `https://github.com/${owner}.png?size=128`;
}

export function ownerAvatar(pool: Pool): string {
  const owner = pool.scope === "org" ? pool.target : pool.target.split("/")[0];
  return githubAvatar(owner);
}
