import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { getPreferenceValues } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";

const execFileAsync = promisify(execFile);
const log = logger.child("[yc]");

// Capture `yc … --json` via a temp FILE rather than a stdout pipe. `yc` exits
// before its stdout pipe fully drains, so a piped capture (execFile/useExec)
// receives only what cleared the OS pipe buffer — truncating large payloads at
// 64KB/128KB boundaries (a 141KB result arrived cut to 65479/131003 bytes,
// breaking JSON.parse). Redirecting to a file lets the OS complete the write
// regardless of the child's flush timing; we then read the whole file.
//
// The redirect needs a shell, so we use `sh -c` with the binary, args, and temp
// path passed as POSITIONAL parameters ($0/$1/$2/…) — never interpolated into
// the command string — so a query containing shell metacharacters can't inject.
async function runYcToFile(
  binary: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  const tmp = join(
    tmpdir(),
    `yc-${process.pid}-${Date.now()}-${Math.round(Math.random() * 1e9)}.json`,
  );
  // $0 = binary, $1..$n = args, last positional = temp path.
  const script = `"$0" ${args.map((_, i) => `"$${i + 1}"`).join(" ")} > "$${args.length + 1}"`;
  try {
    const { stderr } = await execFileAsync(
      "/bin/sh",
      ["-c", script, binary, ...args, tmp],
      { timeout: 60_000, maxBuffer: 1024 * 1024 },
    );
    const stdout = await readFile(tmp, "utf8");
    return { stdout, stderr };
  } catch (raw) {
    // Because stdout is redirected to the file, a non-zero exit leaves the
    // child's diagnostic in the temp file, NOT on err.stdout (which is empty).
    // Read it back and attach it so runYc can still classify update-required /
    // not-authed / 429 — otherwise every CLI error degrades to a generic shell
    // failure. Then rethrow for runYc's catch to handle.
    const err = raw as ExecError;
    if (!err.stdout) {
      err.stdout = await readFile(tmp, "utf8").catch(() => "");
    }
    throw err;
  } finally {
    await unlink(tmp).catch(() => {});
  }
}

// Version context parsed out of the CLI's version-gate message, when present.
// Surfaced on the update-required screen so the user sees what changed.
export type VersionGate = { current?: string; minimum?: string };

export type YcResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      kind: "missing-cli" | "not-authed" | "error";
      message: string;
    }
  | {
      ok: false;
      kind: "update-required";
      message: string;
      gate: VersionGate;
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

// Sentinels for the CLI's version-gate refusal, e.g.:
//   This version of the YC CLI is no longer supported.
//   Run `yc update` to continue.
//   Current version: 0.0.8
//   Minimum required version: 0.0.14
const UPDATE_REQUIRED_SENTINELS = [
  "no longer supported",
  "yc update",
  "minimum required version",
];

export function isUpdateRequiredMessage(message: string): boolean {
  const haystack = message.toLowerCase();
  return UPDATE_REQUIRED_SENTINELS.some((s) => haystack.includes(s));
}

// Pull current/minimum versions out of the gate message so the update screen
// can show what changed. Tolerant of wording drift — matches on the labels,
// not on exact phrasing or line order.
export function parseVersionGate(message: string): VersionGate {
  const clean = stripAnsi(message);
  const current = clean.match(/current version:\s*([0-9][0-9.]*)/i)?.[1];
  const minimum = clean.match(
    /minimum required version:\s*([0-9][0-9.]*)/i,
  )?.[1];
  return { current, minimum };
}

// `yc` writes raw ANSI control sequences into its human-readable output (e.g.
// the `\x1b[K` erase-to-end-of-line that rendered as "Ø[K" in the error view).
// Strip them before any message reaches a Raycast surface. Covers:
//   - CSI sequences: ESC [ … final-byte  (colors, cursor moves, line erases)
//   - OSC sequences: ESC ] … BEL or ST   (titles, hyperlinks)
//   - other two-byte ESC sequences, plus stray C0 control chars (keeps \t \n \r).
// Built from \x escapes so no raw control bytes live in the source.
const ANSI_PATTERN = new RegExp(
  [
    "\\x1b\\[[0-?]*[ -/]*[@-~]", // CSI
    "\\x1b\\][^\\x07\\x1b]*(?:\\x07|\\x1b\\\\)", // OSC … BEL | ST
    "\\x1b[@-Z\\\\-_]", // other two-byte ESC sequences
    "[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]", // stray C0 controls (keep \t \n \r)
  ].join("|"),
  "g",
);

export function stripAnsi(s: string): string {
  return s.replace(ANSI_PATTERN, "");
}

export class NotAuthedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotAuthedError";
  }
}

export class UpdateRequiredError extends Error {
  readonly gate: VersionGate;
  constructor(message: string) {
    super(message);
    this.name = "UpdateRequiredError";
    this.gate = parseVersionGate(message);
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
  const end = s.trimEnd().length;
  const bracket = /[[{]/g;
  let m: RegExpExecArray | null;
  while ((m = bracket.exec(s)) !== null) {
    const slice = balancedSlice(s, m.index);
    if (slice) {
      // Only accept a recovered slice that reaches the END of the input. This
      // recovery exists for leading chatter before an otherwise-complete JSON
      // document (e.g. a "Token expired, refreshing…" notice line) — the real
      // payload runs to EOF. A balanced slice that closes well before the end
      // is an inner fragment of a TRUNCATED/corrupt document; "recovering" it
      // would silently yield garbage (e.g. items:0), which is worse than
      // failing. So reject anything that doesn't consume the tail.
      if (m.index + slice.length >= end) {
        try {
          return { value: JSON.parse(slice) as T };
        } catch {
          // not valid JSON — keep scanning from the next bracket
        }
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

// Classify a known-plain-text CLI message (not a JSON data payload) into the
// specific error it represents, or null when it's just a generic failure.
// `sentinelText` is what we pattern-match; `message` is what the error carries
// for display. The version gate is checked before auth because its text also
// names a command and is the more specific signal. Single source of truth for
// the classification ladder shared by parseYcJson and runYc.
function classifyPlainText(
  sentinelText: string,
  message: string,
): UpdateRequiredError | NotAuthedError | null {
  if (isUpdateRequiredMessage(sentinelText)) {
    return new UpdateRequiredError(message);
  }
  if (isUnauthedMessage(sentinelText)) {
    return new NotAuthedError(message);
  }
  return null;
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
  } catch (e) {
    // Not pure JSON. It may be JSON with leading chatter (auto-refresh notice),
    // or a plain-text error. Try to recover an embedded JSON payload.
    log.debug("Direct JSON.parse failed; attempting recovery", {
      length: stdout.length,
      head: stdout.slice(0, 60),
      tail: stdout.slice(-60),
      error: e instanceof Error ? e.message : String(e),
    });
    const recovered = tryParseEmbeddedJson<T>(stdout);
    if (recovered) {
      log.debug("Recovered embedded JSON payload");
      return recovered.value;
    }
  }

  // No JSON recoverable: it's a plain-text message. Sentinel-matching is safe
  // now because we know this is not a data payload.
  const clean = truncate(stripAnsi(stdout).trim(), 500);
  log.warn("yc output not parseable as JSON", {
    length: stdout.length,
    preview: clean.slice(0, 120),
  });
  throw (
    classifyPlainText(clean, clean) ??
    new Error(`Failed to parse yc output: ${clean}`)
  );
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
      message: "YC CLI not found on this system.",
    };
  }

  log.debug("runYc", { args });
  try {
    const { stdout } = await runYcToFile(binary, args);
    log.debug("runYc stdout received", { args, bytes: stdout.length });
    const data = parseYcJson<T>(stdout);
    return { ok: true, data };
  } catch (raw) {
    const err = raw as ExecError;
    const stderr = stripAnsi(err.stderr ?? "");
    const stdout = stripAnsi(err.stdout ?? "");

    // Binary missing: ENOENT (direct spawn), or `sh` reporting it (exit 127 /
    // "not found") now that we run via sh -c.
    if (
      err.code === "ENOENT" ||
      err.code === 127 ||
      /not found|no such file/i.test(stderr)
    ) {
      cachedPath = null;
      return { ok: false, kind: "missing-cli", message: "YC CLI not found." };
    }

    // A thrown classification from parseYcJson, or a non-zero exit whose
    // stderr/stdout we classify the same way. Only sentinel-match output that
    // is NOT a JSON data payload, so a result body that merely mentions "401"
    // or "yc login" isn't misread.
    const plainText = [stderr, stdout]
      .filter((s) => s && !looksLikeJson(s))
      .join(" ");
    const message = truncate(
      stderr || stdout || stripAnsi(err.message ?? "") || "Unknown error",
      500,
    );

    // Rate limit (429): give a clear, actionable message instead of the raw
    // server line. Fired by rapid successive calls (e.g. fast typing).
    if (/\b429\b|rate limit/i.test(plainText)) {
      return {
        ok: false,
        kind: "error",
        message:
          "YC CLI rate limit reached. Wait a moment and try again. (The server limits rapid requests.)",
      };
    }

    const classified =
      raw instanceof NotAuthedError || raw instanceof UpdateRequiredError
        ? raw
        : classifyPlainText(plainText, message);

    if (classified instanceof UpdateRequiredError) {
      return {
        ok: false,
        kind: "update-required",
        message,
        gate: classified.gate,
      };
    }
    if (classified instanceof NotAuthedError) {
      return { ok: false, kind: "not-authed", message };
    }
    return { ok: false, kind: "error", message };
  }
}

export type CsvSearch = { csv: string; count: number; total: number };

// The `yc search <q> --type <X> --json` envelope, distinct from the rich
// `items[]` shape: { name, result: { csv_results, count, total_count, … } }.
type CsvEnvelope = {
  result?: {
    csv_results?: string;
    count?: number;
    total_count?: number;
  };
};

// Run a typed search and return its CSV payload (for export). Shares runYc's
// argument plumbing and error classification — a too-old or unauthed CLI still
// routes to update-required / not-authed rather than a raw failure.
export async function runYcCsv(
  query: string,
  cliType: string,
): Promise<YcResult<CsvSearch>> {
  const result = await runYc<CsvEnvelope>([
    "search",
    query,
    "--type",
    cliType,
    "--json",
  ]);
  if (!result.ok) return result;

  const csv = result.data.result?.csv_results;
  if (!csv || !csv.trim()) {
    return { ok: false, kind: "error", message: "No CSV data returned." };
  }
  return {
    ok: true,
    data: {
      csv,
      count: result.data.result?.count ?? 0,
      total: result.data.result?.total_count ?? 0,
    },
  };
}

export const INSTALL_COMMAND =
  "curl -fsSL https://bookface.ycombinator.com/cli/install.sh | bash";
export const LOGIN_COMMAND = "yc login";
export const UPDATE_COMMAND = "yc update";
