import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

export type MiseEnv = Record<string, string> & { PATH: string; MISE_YES: "1"; NO_COLOR: "1" };
export type MiseLocation = { path: string; env: MiseEnv };
export type MiseNotFound = { searched: string[] };

export type MiseStorage = { get(key: string): string | undefined; set(key: string, value: string): void };
export type ProbeResult = { env: Record<string, string>; command: string; installPath: string };

export type ResolveOptions = {
  preferredPath?: string;
  storage: MiseStorage;
  exists?: (path: string) => boolean;
  probe?: () => Promise<ProbeResult | undefined>;
  now?: () => number;
};

type EnvRecord = { capturedAt: number; path?: string; env: Record<string, string> };

export const BASE_PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin";
export const PROBE_BACKOFF_MS = 5 * 60 * 1000;
export const ENV_TTL_MS = 24 * 60 * 60 * 1000;
const ENV_KEY = "locate.env";
const PROBE_MISS_KEY = "locate.probeMissAt";
const DROPPED_KEYS = new Set(["_", "SHLVL", "PWD", "OLDPWD", "TERM_SESSION_ID"]);
const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function staticCandidates(): string[] {
  return [join(homedir(), ".local/bin/mise"), "/opt/homebrew/bin/mise", "/usr/local/bin/mise"];
}

// Raycast launches the extension with launchd's environment, which has none of the exports a
// .zshrc or .zprofile makes (CARGO_HOME, GOPATH, MISE_*, PATH additions), so every mise call runs
// with the login shell's environment instead.
export function loginShell(): string {
  const shell = process.env.SHELL ?? "";
  return ["zsh", "bash"].includes(basename(shell)) ? shell : "/bin/zsh";
}

export const PROBE_LABEL = `login shell (${basename(loginShell())} -ilc)`;

export async function resolveMise(options: ResolveOptions): Promise<MiseLocation | MiseNotFound> {
  const { storage, exists = existsSync, probe = loginShellProbe, now = Date.now } = options;

  const preferred = options.preferredPath?.trim() || undefined;
  if (preferred && !exists(preferred)) return { searched: [preferred] };
  const candidates = staticCandidates();
  const staticPath = preferred ?? candidates.find(exists);
  const searched = staticPath ? [] : candidates;

  const cached = readCachedEnv(storage);
  const fresh = cached && now() - cached.capturedAt < ENV_TTL_MS && (!cached.path || exists(cached.path));
  const needsBinary = !staticPath && !(fresh && cached.path);
  const missedAt = Number(storage.get(PROBE_MISS_KEY));
  const backingOff = missedAt > 0 && now() - missedAt < PROBE_BACKOFF_MS;

  let record = fresh ? cached : undefined;
  if (needsBinary) searched.push(PROBE_LABEL);
  if ((!fresh || needsBinary) && !backingOff) {
    const result = await probe();
    if (result) {
      record = { capturedAt: now(), path: pickFromProbe(result, exists), env: result.env };
      storage.set(ENV_KEY, JSON.stringify(record));
    }
    if (!result || !(staticPath ?? record?.path)) storage.set(PROBE_MISS_KEY, String(now()));
  }

  const path = staticPath ?? record?.path;
  return path ? { path, env: miseEnv(record?.env) } : { searched };
}

function miseEnv(env: Record<string, string> = {}): MiseEnv {
  const dirs = (env.PATH ?? "").split(":").filter(Boolean);
  for (const dir of BASE_PATH.split(":")) if (!dirs.includes(dir)) dirs.push(dir);
  return { ...env, PATH: dirs.join(":"), MISE_YES: "1", NO_COLOR: "1" };
}

function readCachedEnv(storage: MiseStorage): EnvRecord | undefined {
  const raw = storage.get(ENV_KEY);
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isEnvRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isEnvRecord(value: unknown): value is EnvRecord {
  if (typeof value !== "object" || value === null) return false;
  const { capturedAt, path, env } = value as Record<string, unknown>;
  return (
    typeof capturedAt === "number" &&
    (path === undefined || typeof path === "string") &&
    typeof env === "object" &&
    env !== null &&
    Object.values(env).every((v) => typeof v === "string")
  );
}

// `command -v mise` returns the bare word "mise" when `mise activate` has defined a shell function,
// so the probed PATH is scanned as a fallback.
function pickFromProbe(result: ProbeResult, exists: (path: string) => boolean): string | undefined {
  const direct = [result.command, result.installPath].filter((p) => p.startsWith("/"));
  const fromPath = (result.env.PATH ?? "")
    .split(":")
    .filter(Boolean)
    .map((dir) => join(dir, "mise"));
  return [...direct, ...fromPath].find((p) => exists(p));
}

const PROBE_SCRIPT = `printf '\\0'; env -0; printf '\\0<<%s||%s>>' "$(command -v mise)" "$MISE_INSTALL_PATH"`;

export function parseProbeOutput(stdout: string): ProbeResult | undefined {
  const segments = stdout.split("\0");
  const sentinel = /<<(.*?)\|\|(.*?)>>/s.exec(segments.pop() ?? "");
  if (!sentinel) return undefined;
  const env: Record<string, string> = {};
  for (const segment of segments) {
    const eq = segment.indexOf("=");
    const key = segment.slice(0, eq);
    if (eq > 0 && KEY_PATTERN.test(key) && !DROPPED_KEYS.has(key)) env[key] = segment.slice(eq + 1);
  }
  return { env, command: sentinel[1], installPath: sentinel[2] };
}

function loginShellProbe(): Promise<ProbeResult | undefined> {
  return new Promise((resolve) => {
    execFile(
      loginShell(),
      ["-ilc", PROBE_SCRIPT],
      { timeout: 5000, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
      (error, stdout) => resolve(error ? undefined : parseProbeOutput(stdout)),
    );
  });
}
