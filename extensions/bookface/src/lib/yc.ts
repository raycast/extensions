import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { getPreferenceValues } from "@raycast/api";

const execFileAsync = promisify(execFile);

export type YcResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      kind: "missing-cli" | "not-authed" | "error";
      message: string;
    };

const BINARY_NAMES = ["yc", "ycp"];
const HARDCODED_FALLBACKS = [
  join(homedir(), ".local/bin"),
  "/opt/homebrew/bin",
  "/usr/local/bin",
];

let cachedPath: string | null = null;

function findBinaryIn(dirs: string[]): string | null {
  for (const dir of dirs) {
    for (const name of BINARY_NAMES) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

export function resolveYcPath(): string | null {
  if (cachedPath) return cachedPath;

  const prefs = getPreferenceValues<Preferences>();
  const fromPref = prefs.ycPath?.trim();
  if (fromPref && existsSync(fromPref)) {
    cachedPath = fromPref;
    return cachedPath;
  }

  const pathDirs = (process.env.PATH ?? "").split(":").filter(Boolean);
  cachedPath = findBinaryIn([...pathDirs, ...HARDCODED_FALLBACKS]);
  return cachedPath;
}

const NOT_AUTHED_SENTINELS = [
  "not logged in",
  "yc login",
  "please log in",
  "unauthorized",
  "401",
  "token expired",
  "session expired",
  "token has expired",
];

export function isUnauthedMessage(message: string): boolean {
  const haystack = message.toLowerCase();
  return NOT_AUTHED_SENTINELS.some((s) => haystack.includes(s));
}

export class NotAuthedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotAuthedError";
  }
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

// Recover a JSON payload from a string that may be prefixed with non-JSON
// chatter (e.g. `yc`'s "Token expired, refreshing…" line printed before the
// real payload). Tries each `{`/`[` position in turn and returns the first
// balanced slice that actually JSON-parses — so a bracketed chatter token like
// "[notice]" before the real payload is skipped rather than latched onto.
function tryParseEmbeddedJson<T>(s: string): { value: T } | null {
  const bracket = /[[{]/g;
  let m: RegExpExecArray | null;
  while ((m = bracket.exec(s)) !== null) {
    const slice = balancedSlice(s, m.index);
    if (slice) {
      try {
        return { value: JSON.parse(slice) as T };
      } catch {
        // not this bracket — keep scanning from the next one
      }
    }
  }
  return null;
}

// Return the substring from `start` (a `{` or `[`) through its matching close,
// honoring strings/escapes, or null if never balanced.
function balancedSlice(s: string, start: number): string | null {
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

// Cheap check: does this output look like a JSON data payload rather than a
// plain-text message? Used to avoid sentinel-matching auth phrases against data.
export function looksLikeJson(s: string): boolean {
  const t = s.trim();
  if (!(t.startsWith("{") || t.startsWith("["))) return false;
  try {
    JSON.parse(t);
    return true;
  } catch {
    return tryParseEmbeddedJson(t) !== null;
  }
}

export function parseYcJson<T>(stdout: string): T {
  if (!stdout || !stdout.trim()) {
    throw new Error("yc returned empty output");
  }

  // Parse first. Successful `yc --json` output is always valid JSON, so a clean
  // parse means success regardless of content — a search result whose body
  // happens to contain "yc login" must NOT be misread as an auth error.
  try {
    return JSON.parse(stdout) as T;
  } catch {
    // Not pure JSON. It may be JSON with leading chatter (auto-refresh notice),
    // or a plain-text error. Try to recover an embedded JSON payload.
    const recovered = tryParseEmbeddedJson<T>(stdout);
    if (recovered) return recovered.value;
  }

  // No JSON recoverable: it's a plain-text message. Now sentinel-matching is
  // safe because we know this is not a data payload.
  if (isUnauthedMessage(stdout)) {
    throw new NotAuthedError(truncate(stdout.trim(), 500));
  }
  throw new Error(`Failed to parse yc output: ${truncate(stdout.trim(), 500)}`);
}

type ExecError = Error & {
  stdout?: string;
  stderr?: string;
  code?: string | number;
};

export async function runYc<T>(args: string[]): Promise<YcResult<T>> {
  const binary = resolveYcPath();
  if (!binary) {
    return {
      ok: false,
      kind: "missing-cli",
      message: "yc CLI not found on this system.",
    };
  }

  try {
    const { stdout } = await execFileAsync(binary, args, {
      timeout: 60_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return { ok: true, data: parseYcJson<T>(stdout) };
  } catch (raw) {
    if (raw instanceof NotAuthedError) {
      return { ok: false, kind: "not-authed", message: raw.message };
    }
    const err = raw as ExecError;
    const stderr = err.stderr ?? "";
    const stdout = err.stdout ?? "";

    if (err.code === "ENOENT") {
      cachedPath = null;
      return { ok: false, kind: "missing-cli", message: "yc CLI not found." };
    }
    // Only sentinel-match against output that is NOT a JSON data payload — same
    // guard as parseYcJson, so a result/error body that merely mentions "401" or
    // "yc login" isn't misread as an auth failure. Auth errors are plain text.
    const authText = [stderr, stdout]
      .filter((s) => s && !looksLikeJson(s))
      .join(" ");
    if (authText && isUnauthedMessage(authText)) {
      return {
        ok: false,
        kind: "not-authed",
        message: truncate(stderr || stdout || "Not logged in.", 500),
      };
    }
    return {
      ok: false,
      kind: "error",
      message: truncate(
        stderr || stdout || err.message || "Unknown error",
        500,
      ),
    };
  }
}

export const INSTALL_COMMAND =
  "curl -fsSL https://bookface.ycombinator.com/cli/install.sh | bash";
export const LOGIN_COMMAND = "yc login";
