import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import { CallView, Contact, Room, StoredCall, TranscriptMatch, TupleError, TupleErrorKind } from "./types";

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

/** Map any thrown exec error to a classified {@link TupleError}. */
export function classifyError(error: unknown): TupleError {
  if (error instanceof TupleError) {
    return error;
  }

  const err = error as { code?: string | number; message?: string; stderr?: string } | undefined;
  const stderr = typeof err?.stderr === "string" ? err.stderr : "";
  const haystack = `${err?.message ?? ""}\n${stderr}`.toLowerCase();
  const detail = (stderr || err?.message || "").trim() || undefined;

  // Binary missing: spawn ENOENT, or a shell layer reporting "command not found".
  if (err?.code === "ENOENT" || haystack.includes("command not found")) {
    return new TupleError(
      TupleErrorKind.NotInstalled,
      "The tuple CLI could not be found. Install Tuple or set the Tuple CLI Path preference.",
      detail,
    );
  }

  // Call-scoped command with no active call. Frequently a normal state (e.g. menu bar).
  if (haystack.includes("not in a call") || haystack.includes("no active call")) {
    return new TupleError(TupleErrorKind.NoActiveCall, "No active call.", detail);
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

/** List rooms as one flat, kind-tagged array. Extra args (e.g. "--kind", "personal") narrow the result. */
export async function listRooms(...extraArgs: string[]): Promise<Room[]> {
  return (await runTupleJson<Room[]>(["rooms", "list", ...extraArgs])) ?? [];
}

// --- Action wrappers -----------------------------------------------------------------
// Contacts and call participants are addressed by email, which uniquely resolves a person
// (partial names are ambiguous and the CLI rejects them).

export async function startCall(email: string): Promise<void> {
  await runTuple(["call", "start", email]);
}

export async function addToCall(email: string): Promise<void> {
  await runTuple(["call", "add", email]);
}

/** Join a call/room by person name or room URL/slug. */
export async function joinCall(target: string): Promise<void> {
  await runTuple(["call", "join", target]);
}

export async function setFavorite(email: string, favorited: boolean): Promise<void> {
  await runTuple(["contacts", favorited ? "favorite" : "unfavorite", email]);
}

/** Favorite or unfavorite a room, addressed by its slug (the CLI also accepts the room URL). */
export async function setRoomFavorite(slug: string, favorited: boolean): Promise<void> {
  await runTuple(["rooms", favorited ? "favorite" : "unfavorite", slug]);
}

export async function muteCall(): Promise<void> {
  await runTuple(["call", "mute"]);
}

export async function unmuteCall(): Promise<void> {
  await runTuple(["call", "unmute"]);
}

export async function hangUpCall(): Promise<void> {
  await runTuple(["call", "hang-up"]);
}

export async function startTranscription(): Promise<void> {
  await runTuple(["transcription", "start"]);
}

export async function stopTranscription(): Promise<void> {
  await runTuple(["transcription", "stop"]);
}

export async function setCallTitle(callId: string, title: string): Promise<void> {
  await runTuple(["transcription", "set-title", callId, title]);
}

export async function setCallSummary(callId: string, summary: string): Promise<void> {
  await runTuple(["transcription", "set-summary", callId, summary]);
}

/** Permanently delete a stored call's transcript. Irreversible — confirm before calling. */
export async function deleteTranscript(callId: string): Promise<void> {
  await runTuple(["transcription", "delete", callId]);
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
 * Fetch a stored call's transcript as plain text (`transcription show`, default format). ANSI codes
 * are stripped defensively (see {@link stripAnsi}) so every consumer — including AI summarization
 * and the read-transcript tool — gets clean text even from an older CLI that colorized its output.
 */
export async function getTranscript(callId: string): Promise<string> {
  return stripAnsi(await runTuple(["transcription", "show", callId]));
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
