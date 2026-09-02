import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import {
  CallView,
  Contact,
  OngoingCall,
  Room,
  StoredCall,
  TranscriptMatch,
  TupleError,
  TupleErrorKind,
  TupleErrorPayload,
} from "./types";

const execFileAsync = promisify(execFile);

/**
 * Where the `tuple` CLI lives, tried in order when no preference is set. The Tuple app's "Install
 * CLI" integration symlinks the bundled binary to `/usr/local/bin/tuple`; if the user never ran it,
 * fall back to the binary bundled inside the app itself (the CLI ships with the app — there is no
 * Homebrew build), checking the system and user Applications folders.
 */
const BUNDLED_CLI = "Tuple.app/Contents/SharedSupport/bin/tuple";
const FALLBACK_PATHS = [
  "/usr/local/bin/tuple",
  `/Applications/${BUNDLED_CLI}`,
  `${homedir()}/Applications/${BUNDLED_CLI}`,
];

/**
 * Resolve the `tuple` executable. Raycast does not inherit the user's interactive shell
 * `PATH`, so we cannot rely on bare `tuple` resolving — we use an explicit path.
 */
export function getBinaryPath(): string {
  const { tuplePath } = getPreferenceValues<Preferences>();
  const preferred = tuplePath?.trim();
  if (preferred) {
    return preferred;
  }
  for (const candidate of FALLBACK_PATHS) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  // Nothing found — return the canonical install location so the resulting ENOENT is classified
  // as NotInstalled and the empty state points the user at the right place.
  return FALLBACK_PATHS[0];
}

/**
 * Environment for CLI invocations. Raycast strips the shell `PATH`, so we prepend the
 * common bin directories in case the CLI shells out to anything itself.
 */
export function execEnv(): NodeJS.ProcessEnv {
  const extraPath = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin";
  return { ...process.env, PATH: `${extraPath}:${process.env.PATH ?? ""}` };
}

/** Args for a read command that emits JSON — pass these to `useExec`'s command/args. */
export function jsonArgs(...args: string[]): string[] {
  return [...args, "--format", "json"];
}

/** Stderr fragments that mean the CLI couldn't reach the Tuple daemon (app not running). */
const DAEMON_DOWN_SIGNALS = ["tuple.sock", "dial unix", "connection refused", "connect: no such file"];

function fromPayload(payload: TupleErrorPayload): { kind: TupleErrorKind; message: string } | null {
  const message = payload.error?.trim();
  switch (payload.kind) {
    case "contact_offline":
      return { kind: TupleErrorKind.ContactOffline, message: message || "They’re offline." };
    case "contact_busy":
      return { kind: TupleErrorKind.ContactBusy, message: message || "They’re already on a call." };
    case "invalid_call":
      return { kind: TupleErrorKind.NotJoinable, message: message || "That call can’t be joined." };
    case "conflict":
      return {
        kind: TupleErrorKind.AlreadyInCall,
        message: message || "You’re already in a call. Hang up first, then join.",
      };
  }
  // Older structured envelopes had an HTTP status but no stable kind.
  if (payload.kind) {
    return null;
  }
  switch (payload.error_code) {
    case 409:
      return { kind: TupleErrorKind.AlreadyInCall, message: "You’re already in a call. Hang up first, then join." };
    case 410:
      return { kind: TupleErrorKind.NoActiveCall, message: "No active call." };
  }
  return null;
}

/**
 * Parse the JSON error envelope. Current CLIs write it to *stdout* under
 * `--format json` — stderr stays empty — so the raw exec error carries it
 * there. Anything that isn't a JSON object with an `error`/`kind` is not an
 * envelope (an older CLI's prose, or a command run without `--format json`).
 */
function parseErrorPayload(stdout: string): TupleErrorPayload | null {
  const text = stdout.trim();
  if (!text.startsWith("{")) {
    return null;
  }
  try {
    const parsed = JSON.parse(text) as TupleErrorPayload;
    return typeof parsed?.error === "string" || typeof parsed?.kind === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/** Map any thrown exec error to a classified {@link TupleError}. */
export function classifyError(error: unknown): TupleError {
  if (error instanceof TupleError) {
    return error;
  }

  const err = error as { code?: string | number; message?: string; stdout?: string; stderr?: string } | undefined;
  const stdout = typeof err?.stdout === "string" ? err.stdout : "";
  const stderr = typeof err?.stderr === "string" ? err.stderr : "";
  // Commands asking for `--format json` report failures on stdout rather than
  // stderr, so every signal below has to consider both streams.
  const haystack = `${err?.message ?? ""}\n${stderr}\n${stdout}`.toLowerCase();
  const detail = (stderr || stdout || err?.message || "").trim() || undefined;

  // Binary missing: spawn ENOENT, or a shell layer reporting "command not found".
  if (err?.code === "ENOENT" || haystack.includes("command not found")) {
    return new TupleError(
      TupleErrorKind.NotInstalled,
      "The tuple CLI could not be found. Install Tuple or set the Tuple CLI Path preference.",
      detail,
    );
  }

  const payload = parseErrorPayload(stdout);
  if (payload) {
    const classified = fromPayload(payload);
    if (classified) {
      return new TupleError(classified.kind, classified.message, detail);
    }
  }

  // Prose fallback, retained for CLIs predating the structured envelope.
  // Call-scoped command with no active call. Frequently a normal state (e.g. menu bar).
  if (haystack.includes("not in a call") || haystack.includes("no active call")) {
    return new TupleError(TupleErrorKind.NoActiveCall, "No active call.", detail);
  }

  if (haystack.includes("not on a joinable call")) {
    return new TupleError(TupleErrorKind.NotJoinable, "That call can’t be joined.", detail);
  }

  // Joining while already in a call: the CLI returns 409 instead of switching you over.
  if (haystack.includes("call already exists")) {
    return new TupleError(TupleErrorKind.AlreadyInCall, "You’re already in a call. Hang up first, then join.", detail);
  }

  // CLI reached for the daemon socket but the Tuple app is not running.
  if (DAEMON_DOWN_SIGNALS.some((signal) => haystack.includes(signal))) {
    return new TupleError(
      TupleErrorKind.DaemonDown,
      "Could not reach Tuple. Make sure the Tuple app is running.",
      detail,
    );
  }

  // Transcript store not initialized — transcription has never run on this machine.
  if (haystack.includes("transcription store unavailable")) {
    return new TupleError(
      TupleErrorKind.TranscriptionUnavailable,
      "Transcription hasn’t run on this Mac yet, so there are no recorded calls.",
      detail,
    );
  }

  return new TupleError(TupleErrorKind.Unknown, err?.message?.trim() || "The tuple command failed.", detail);
}

/** True when an error is the CLI's "no active call" condition — usually a normal state, not a failure. */
export function isNoActiveCall(error: unknown): boolean {
  return classifyError(error).kind === TupleErrorKind.NoActiveCall;
}

/** Deep links into the Tuple app's settings panes (handled by the tuple:// URL scheme). */
export const TUPLE_DEEP_LINKS = {
  open: "tuple://open",
  transcriptionSettings: "tuple://preferences/transcription",
  integrationSettings: "tuple://preferences/integrations",
} as const;

/** Run a `tuple` subcommand and return stdout, throwing a classified {@link TupleError} on failure. */
export async function runTuple(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(getBinaryPath(), args, {
      env: execEnv(),
      timeout: 15_000,
      maxBuffer: 32 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    // Note: a SIGKILL (exit 137) with empty stderr right after a `tuple` upgrade is usually the
    // macOS AMFI codesign-cache bug, not a CLI fault — re-sign with `codesign --force --sign -`.
    throw classifyError(error);
  }
}

/** Run a read command with `--format json` and parse the result. */
export async function runTupleJson<T>(args: string[]): Promise<T> {
  const stdout = await runTuple(jsonArgs(...args));
  return parseJson<T>(stdout);
}

/** Parse CLI stdout as JSON, wrapping parse failures so callers never see a success-shaped value. */
export function parseJson<T>(stdout: string): T {
  try {
    return JSON.parse(stdout) as T;
  } catch {
    throw new TupleError(TupleErrorKind.Unknown, "Could not parse tuple output as JSON.", stdout.trim() || undefined);
  }
}

// --- Read wrappers -------------------------------------------------------------------
// List/search reads are issued directly by the views via useTupleJson; getActiveCall and
// listRooms are the reads also needed imperatively (the no-view mute toggle and the
// join-personal-room command).

/** The active call as the normalized flat CallView. Throws NoActiveCall when not in a call. */
export function getActiveCall(): Promise<CallView> {
  return runTupleJson<CallView>(["call", "current"]);
}

export async function listContacts(): Promise<Contact[]> {
  return (await runTupleJson<Contact[]>(["contacts", "list"])) ?? [];
}

/** Ongoing calls, grouped and privacy-normalized by the CLI. */
export async function listOngoingCalls(): Promise<OngoingCall[]> {
  return (await runTupleJson<OngoingCall[]>(["call", "list"])) ?? [];
}

/** List rooms as one flat, kind-tagged array. Extra args (e.g. "--kind", "personal") narrow the result. */
export async function listRooms(...extraArgs: string[]): Promise<Room[]> {
  return (await runTupleJson<Room[]>(["rooms", "list", ...extraArgs])) ?? [];
}

// --- Action wrappers -----------------------------------------------------------------
// Contacts and call participants are addressed by email, which uniquely resolves a person
// (partial names are ambiguous and the CLI rejects them).

/**
 * Run a mutating command and discard its output. It goes through JSON mode
 * because that is what makes the CLI emit its `{error, error_code, kind}`
 * envelope on failure; the reads that need human-readable text
 * (`transcription show`, `connect --print`) keep calling {@link runTuple}.
 */
async function runTupleAction(args: string[]): Promise<void> {
  await runTuple(jsonArgs(...args));
}

function isUnsupportedFlag(error: unknown, flag: string): boolean {
  const classified = classifyError(error);
  return `${classified.message}\n${classified.detail ?? ""}`.toLowerCase().includes(`unknown flag: ${flag}`);
}

async function runWithOptionalArgs<T>(
  run: (args: string[]) => Promise<T>,
  args: string[],
  optionalArgs: string[],
): Promise<T> {
  try {
    return await run([...args, ...optionalArgs]);
  } catch (error) {
    const unsupported = optionalArgs.find((arg) => arg.startsWith("--") && isUnsupportedFlag(error, arg));
    if (!unsupported) {
      throw error;
    }
    return run(args);
  }
}

async function runTupleActionWithFallback(args: string[], optionalArgs: string[]): Promise<void> {
  await runWithOptionalArgs(runTupleAction, args, optionalArgs);
}

export function startCall(email: string): Promise<void> {
  return runTupleActionWithFallback(["call", "start", email], ["--wait", "--timeout", "12s"]);
}

export function addToCall(email: string): Promise<void> {
  return runTupleActionWithFallback(["call", "add", email], ["--wait", "--timeout", "12s"]);
}

/** Join a call/room by person name or room URL/slug, switching from the current call when needed. */
export function joinCall(target: string): Promise<void> {
  return runTupleActionWithFallback(["call", "join", target], ["--switch"]);
}

export function setFavorite(email: string, favorited: boolean): Promise<void> {
  return runTupleAction(["contacts", favorited ? "favorite" : "unfavorite", email]);
}

/** Favorite or unfavorite a room, addressed by its slug (the CLI also accepts the room URL). */
export function setRoomFavorite(slug: string, favorited: boolean): Promise<void> {
  return runTupleAction(["rooms", favorited ? "favorite" : "unfavorite", slug]);
}

export function muteCall(): Promise<void> {
  return runTupleAction(["call", "mute"]);
}

export function unmuteCall(): Promise<void> {
  return runTupleAction(["call", "unmute"]);
}

export function hangUpCall(): Promise<void> {
  return runTupleAction(["call", "hang-up"]);
}

export function startTranscription(): Promise<void> {
  return runTupleAction(["transcription", "start"]);
}

export function stopTranscription(): Promise<void> {
  return runTupleAction(["transcription", "stop"]);
}

export function setCallTitle(callId: string, title: string): Promise<void> {
  return runTupleAction(["transcription", "set-title", callId, title]);
}

export function setCallSummary(callId: string, summary: string): Promise<void> {
  return runTupleAction(["transcription", "set-summary", callId, summary]);
}

/** Permanently delete a stored call's transcript. Irreversible — confirm before calling. */
export function deleteTranscript(callId: string): Promise<void> {
  return runTupleAction(["transcription", "delete", callId]);
}

/** Export one call (or all, when callId is omitted) to a directory. `transcription export` has no JSON mode. */
export async function exportTranscripts(directory: string, callId?: string): Promise<void> {
  const args = ["transcription", "export", directory];
  if (callId) {
    args.push("--call", callId);
  }
  await runTuple(args);
}

// Built without a literal control char to satisfy no-control-regex.
const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

/**
 * Strip ANSI SGR color codes (e.g. ESC[1;36m) from CLI output. Current `tuple` builds emit clean,
 * uncolored text from `transcription show` for non-TTY output, so this is defense-in-depth: the
 * extension can be pointed at an older bundled CLI that still colorized regardless of TTY/NO_COLOR,
 * and it keeps every consumer — display, AI prompts, AI tools — on plain text either way.
 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

/**
 * Fetch a stored call's transcript using the CLI's default timestamp format.
 * ANSI codes are stripped defensively (see {@link stripAnsi}) so agent tools get
 * clean text even from an older CLI that colorized its output.
 */
export async function getTranscript(callId: string): Promise<string> {
  return stripAnsi(await runTuple(["transcription", "show", callId]));
}

/**
 * Fetch compact transcript text for human display and title/summary generation.
 * Current CLIs honor `--timestamps clock`; older CLIs already default to clocks
 * and reach the same result through the optional-flag fallback.
 */
export async function getCompactTranscript(callId: string): Promise<string> {
  const transcript = await runWithOptionalArgs(runTuple, ["transcription", "show", callId], ["--timestamps", "clock"]);
  return stripAnsi(transcript);
}

/**
 * Run a transcript query, treating "transcription has never run" as an empty result rather than an
 * error — there genuinely are no recorded calls yet, which every caller renders as an empty list.
 */
async function emptyIfTranscriptionUnavailable<T>(run: () => Promise<T[] | null>): Promise<T[]> {
  try {
    return (await run()) ?? [];
  } catch (error) {
    if (classifyError(error).kind === TupleErrorKind.TranscriptionUnavailable) {
      return [];
    }
    throw error;
  }
}

/** List all stored (recorded) calls. Empty when transcription has never run (no store / null result). */
export function listRecordedCalls(): Promise<StoredCall[]> {
  return emptyIfTranscriptionUnavailable(() => runTupleJson<StoredCall[]>(["transcription", "list"]));
}

/**
 * Quote each term so arbitrary input is always valid FTS5: special characters (hyphens,
 * colons, operators) are treated as literal text instead of breaking the query parser.
 * Terms are ANDed, so a segment must contain all of them.
 */
export function toFtsQuery(query: string): string {
  return query
    .replace(/"/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term}"`)
    .join(" ");
}

/** Full-text search transcript segments across stored calls. Terms are matched together (AND). */
export function searchTranscriptSegments(
  query: string,
  opts: { limit?: number; participant?: string } = {},
): Promise<TranscriptMatch[]> {
  const ftsQuery = toFtsQuery(query);
  if (!ftsQuery) {
    return Promise.resolve([]);
  }

  const args = ["transcription", "search", ftsQuery];
  if (opts.limit) {
    args.push("--limit", String(opts.limit));
  }
  if (opts.participant) {
    args.push("--participant", opts.participant);
  }

  return emptyIfTranscriptionUnavailable(() => runTupleJson<TranscriptMatch[]>(args));
}

/** Remove the `[[...]]` match markers `transcription search` adds around matched terms. */
export function stripMatchMarkers(text: string): string {
  return text.replace(/\[\[|\]\]/g, "");
}

/**
 * Build the AI context prompt for a call via `tuple connect --print`, without launching an agent.
 * With no callId it describes the live call; with a stored call's id it builds the "review this
 * recorded call" prompt. Non-mutating — it only assembles and prints the prompt.
 */
export function getConnectPrompt(callId?: string): Promise<string> {
  const args = ["connect", "--print"];
  if (callId) {
    args.push("--call", callId);
  }
  return runTuple(args);
}
