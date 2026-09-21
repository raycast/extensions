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
  CaptureMatch,
  CanonicalCall,
  StateSummary,
  CaptureRecord,
  ExportReceipt,
  TupleError,
  TupleErrorKind,
  TupleErrorPayload,
} from "./types";

import { formatCapture } from "./capture";

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
  return ["--format", "json", ...args];
}

/** Classify only machine fields; canonical errors belong to stderr. */
export function classifyError(error: unknown): TupleError {
  if (error instanceof TupleError) return error;
  const err = error as { code?: string | number; message?: string; stderr?: string } | undefined;
  const detail = err?.stderr?.trim() || err?.message?.trim();
  if (err?.code === "ENOENT") {
    return new TupleError(
      TupleErrorKind.NotInstalled,
      "The tuple CLI could not be found. Install Tuple or set the Tuple CLI Path preference.",
      detail,
    );
  }
  let payload: TupleErrorPayload | undefined;
  try {
    const parsed = JSON.parse(err?.stderr ?? "") as TupleErrorPayload | null;
    if (parsed && typeof parsed.error === "string") payload = parsed;
  } catch {
    payload = undefined;
  }
  const kinds: Record<string, TupleErrorKind> = {
    no_active_call: TupleErrorKind.NoActiveCall,
    daemon_down: TupleErrorKind.DaemonDown,
    transcription_unavailable: TupleErrorKind.CaptureUnavailable,
    contact_offline: TupleErrorKind.ContactOffline,
    contact_busy: TupleErrorKind.ContactBusy,
    invalid_call: TupleErrorKind.NotJoinable,
    conflict: TupleErrorKind.AlreadyInCall,
  };
  return new TupleError(
    kinds[payload?.kind ?? ""] ?? TupleErrorKind.Unknown,
    payload?.error || "The tuple command failed. Check that Tuple supports the canonical CLI.",
    detail,
  );
}

/** True when an error is the CLI's "no active call" condition — usually a normal state, not a failure. */
export function isNoActiveCall(error: unknown): boolean {
  return classifyError(error).kind === TupleErrorKind.NoActiveCall;
}

/** Deep links into the Tuple app's settings panes (handled by the tuple:// URL scheme). */
export const TUPLE_DEEP_LINKS = {
  open: "tuple://open",
  captureSettings: "tuple://preferences/capture",
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

export async function getCall(callId?: string): Promise<CanonicalCall> {
  const call = await runTupleJson<CanonicalCall>(["call", "show", ...(callId ? [callId] : [])]);
  const optionalText = (value: unknown) => value === null || typeof value === "string";
  if (
    !call ||
    typeof call.id !== "string" ||
    !call.id ||
    !["active", "ended"].includes(call.state) ||
    !Array.isArray(call.participants) ||
    ![call.title, call.summary, call.started_at, call.ended_at].every(optionalText)
  ) {
    throw new TupleError(
      TupleErrorKind.Unknown,
      "Tuple returned an invalid canonical Call. Check the supported Tuple version.",
    );
  }
  return call;
}

/** State supplies controls that the canonical Call metadata intentionally omits. */
export async function getActiveCall(): Promise<CallView> {
  const state = await runTupleJson<StateSummary>(["state"]);
  if (!state.in_call && state.call === null) {
    throw new TupleError(TupleErrorKind.NoActiveCall, "No active call.");
  }
  if (
    !state.in_call ||
    !state.call ||
    typeof state.call.muted !== "boolean" ||
    typeof state.call.transcribing !== "boolean"
  ) {
    throw new TupleError(TupleErrorKind.Unknown, "Tuple returned invalid active-call state.");
  }
  const call = await getCall(state.call.call_id);
  if (call.id !== state.call.call_id || call.state !== "active") {
    throw new TupleError(TupleErrorKind.Unknown, "The active call changed. Refresh and try again.");
  }
  return state.call;
}

export async function listContacts(): Promise<Contact[]> {
  return (await runTupleJson<Contact[]>(["contacts", "list"])) ?? [];
}

export async function listOngoingCalls(): Promise<OngoingCall[]> {
  return (await runTupleJson<OngoingCall[]>(["call", "list"])) ?? [];
}

export async function listRooms(...extraArgs: string[]): Promise<Room[]> {
  return (await runTupleJson<Room[]>(["rooms", "list", "--members", ...extraArgs])) ?? [];
}

// --- Action wrappers -----------------------------------------------------------------
// Contacts and call participants are addressed by email, which uniquely resolves a person
// (partial names are ambiguous and the CLI rejects them).

async function runTupleAction(args: string[]): Promise<void> {
  await runTuple(jsonArgs(...args));
}

export function startCall(email: string): Promise<void> {
  return runTupleAction(["call", "start", email, "--wait", "--timeout", "12s"]);
}

export function addToCall(email: string): Promise<void> {
  return runTupleAction(["call", "participants", "add", email, "--wait", "--timeout", "12s"]);
}

export function removeFromCall(email: string): Promise<void> {
  return runTupleAction(["call", "participants", "remove", email]);
}

export function joinCall(target: string): Promise<void> {
  return runTupleAction(["call", "join", target, "--switch"]);
}

export function joinRoom(slug: string): Promise<void> {
  return runTupleAction(["rooms", "join", slug, "--switch"]);
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
  return runTupleAction(["call", "leave"]);
}

export function startCapture(): Promise<void> {
  return runTupleAction(["capture", "start"]);
}

export function stopCapture(): Promise<void> {
  return runTupleAction(["capture", "stop"]);
}

type CallMetadataUpdate = { title: string; summary?: string } | { title?: string; summary: string };

export function setCallMetadata(callId: string, update: CallMetadataUpdate): Promise<void> {
  const args = ["call", "edit", callId];
  if (update.title !== undefined) args.push("--title", update.title);
  if (update.summary !== undefined) args.push("--summary", update.summary);
  return runTupleAction(args);
}

export function deleteCapture(callId: string): Promise<void> {
  return runTupleAction(["capture", "delete", callId]);
}

export function exportCapture(destination: string, callId?: string, transcriptOnly = false): Promise<ExportReceipt> {
  const args = ["capture", "export", destination];
  if (callId) args.push("--call", callId);
  if (transcriptOnly) args.push("--exclude", "events,content");
  return runTupleJson<ExportReceipt>(args);
}

const ANSI_ESCAPE = String.fromCharCode(27);
const ANSI_PATTERN = new RegExp(`${ANSI_ESCAPE}\\[[0-9;]*m`, "g");

export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

/** Capture snapshots are NDJSON, including events and shared content by default. */
export async function getCapture(callId: string): Promise<CaptureRecord[]> {
  const stdout = await runTuple(jsonArgs("capture", "show", callId));
  return stdout
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      const record = parseJson<CaptureRecord>(line);
      if (
        !record ||
        typeof record.id !== "number" ||
        typeof record.type !== "string" ||
        typeof record.time !== "string" ||
        !record.data ||
        typeof record.data !== "object" ||
        Array.isArray(record.data)
      ) {
        throw new TupleError(TupleErrorKind.Unknown, "Tuple returned an invalid Capture record.");
      }
      return record;
    });
}

export async function getLocalClockCapture(callId: string): Promise<string> {
  return formatCapture(await getCapture(callId));
}

export async function getLocalClockCaptureMarkdown(callId: string): Promise<string> {
  return formatCapture(await getCapture(callId), true);
}

/** Bounded store-owned recent calls, filtered before the limit is applied. */
export function listRecordedCalls(opts: { limit?: number; participant?: string } = {}): Promise<StoredCall[]> {
  const args = ["capture", "list", "--limit", String(opts.limit ?? 100)];
  if (opts.participant) args.push("--participant", opts.participant);
  return runTupleJson<StoredCall[] | null>(args).then((calls) => calls ?? []);
}

/** Pass user input intact. Core owns the search grammar and occurrence limit. */
export function captureSearchArgs(query: string, opts: { limit?: number; participant?: string } = {}): string[] {
  const args = ["capture", "search", "--kind", "all", "--limit", String(opts.limit ?? 50)];
  if (opts.participant) args.push("--participant", opts.participant);
  return [...args, "--", query];
}

export function searchCapture(
  query: string,
  opts: { limit?: number; participant?: string } = {},
): Promise<CaptureMatch[]> {
  if (!query.trim()) return Promise.resolve([]);
  return runTupleJson<CaptureMatch[] | null>(captureSearchArgs(query, opts)).then((matches) => matches ?? []);
}

export function stripMatchMarkers(text: string): string {
  return text.replace(/\[\[|\]\]/g, "");
}

/**
 * Build the AI context prompt for a call via `tuple connect prompt`, without launching an agent.
 * With no callId it describes the live call; with a stored call's id it builds the "review this
 * recorded call" prompt. Non-mutating — it only assembles and prints the prompt.
 */
export function getConnectPrompt(callId?: string): Promise<string> {
  const args = ["connect", "prompt", "--format", "json"];
  if (callId) {
    args.push("--call", callId);
  }
  return runTuple(args);
}
