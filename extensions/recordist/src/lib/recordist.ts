/**
 * The Recordist app's local API (https://recordist.app/developers/local-api): http://127.0.0.1:47321 while the app
 * runs, loopback only. Every request but /v1/health needs a bearer token. By default the extension reads the token
 * Recordist keeps for the user's own tools (the `api_token` file in its data folder, the same file the Recordist MCP
 * gateway reads); a token pasted in the extension's preferences takes its place. The token goes to 127.0.0.1 and
 * nowhere else.
 */
import { getPreferenceValues } from "@raycast/api";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export const API_BASE = "http://127.0.0.1:47321";
export const BUNDLE_ID = "app.recordist.desktop";
export const DOWNLOAD_URL = "https://recordist.app/download?from=raycast";

/** A look at the app's state waits this long; a press (start, stop, marker) waits longer, as a stop writes the last of the transcript first. */
const READ_TIMEOUT_MS = 8_000;
const ACTION_TIMEOUT_MS = 30_000;

/** The app answered with its error envelope `{ error: { code, message } }`. */
export class RecordistApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "RecordistApiError";
    this.status = status;
  }
}

/** Nothing answered at 127.0.0.1:47321: the app is not running, or (`timedOut`) it is too busy to answer in time. */
export class RecordistUnreachableError extends Error {
  readonly timedOut: boolean;
  constructor(timedOut: boolean) {
    super(timedOut ? "Recordist did not answer in time." : "Recordist is not running.");
    this.name = "RecordistUnreachableError";
    this.timedOut = timedOut;
  }
}

/** No token: no preference, and no `api_token` file because Recordist has not been opened on this computer yet. */
export class RecordistNoTokenError extends Error {
  constructor() {
    super("Open Recordist once, so it can make the token its own tools use, then try again.");
    this.name = "RecordistNoTokenError";
  }
}

/** Where Recordist keeps its data, as the app and its MCP gateway agree. */
export function dataDir(platform: NodeJS.Platform = process.platform, env: NodeJS.ProcessEnv = process.env): string {
  const home = homedir();
  if (platform === "darwin") return path.join(home, "Library", "Application Support", BUNDLE_ID);
  if (platform === "win32") return path.join(env.LOCALAPPDATA ?? path.join(home, "AppData", "Local"), BUNDLE_ID);
  return path.join(env.XDG_DATA_HOME || path.join(home, ".local", "share"), BUNDLE_ID);
}

/** The token to send: the one in the preferences, else Recordist's own, else none. */
export function readToken(): string | null {
  const fromPrefs = getPreferenceValues<Preferences>().apiToken?.trim();
  if (fromPrefs) return fromPrefs;
  try {
    const file = path.join(dataDir(), "api_token");
    if (!existsSync(file)) return null;
    const token = readFileSync(file, "utf8").trim();
    return token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

export interface Attendee {
  name: string;
  email?: string | null;
}

export interface MeetingSummary {
  id: string;
  title: string | null;
  source_app: string | null;
  started_at: number;
  ended_at: number | null;
  duration_ms: number | null;
  status: string;
  attendees: Attendee[];
  tags: string[];
  starred: boolean;
}

export interface Note {
  id: string;
  kind: string;
  content_md: string;
}

export interface ActionItem {
  id: string;
  text: string;
  owner: string | null;
  due: string | null;
  done: boolean;
}

export interface Meeting extends MeetingSummary {
  notes: Note[];
  action_items: ActionItem[];
}

export interface Segment {
  speaker: string | null;
  channel: string;
  start_ms: number;
  end_ms: number;
  text: string;
}

export interface Health {
  ok?: boolean;
  version?: string;
  recording?: { active?: boolean; finishing?: boolean; meeting_id?: string | null };
  /** "Allow agents to start recordings" in Recordist, Settings, Integrations (Recordist 1.0.5 and later). */
  allow_remote_start?: boolean;
}

export interface PromptAnswer {
  prompt_id?: string | null;
  /** Why no card came up (Recordist 1.0.5 and later): recording, starting, finishing, snoozed, cooldown, series_skipped, auto_recording. */
  reason?: string | null;
}

type Method = "GET" | "POST";

async function request<T>(
  method: Method,
  route: string,
  body?: unknown,
  opts: { auth?: boolean; text?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: opts.text ? "text/markdown" : "application/json" };
  if (opts.auth !== false) {
    const token = readToken();
    if (!token) throw new RecordistNoTokenError();
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), method === "GET" ? READ_TIMEOUT_MS : ACTION_TIMEOUT_MS);
  let res: Response;
  let raw: string;
  // The timeout covers the whole answer, body included, so an export that stalls midway fails instead of copying a
  // partial or empty text as if it had worked.
  try {
    res = await fetch(`${API_BASE}${route}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      redirect: "error",
    });
    raw = await res.text();
  } catch {
    throw new RecordistUnreachableError(controller.signal.aborted);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    let message = "";
    try {
      message = (JSON.parse(raw) as { error?: { message?: string } }).error?.message ?? "";
    } catch {
      message = "";
    }
    throw new RecordistApiError(res.status, message || `Recordist answered ${res.status}.`);
  }
  if (opts.text) return raw as T;
  return (raw ? JSON.parse(raw) : {}) as T;
}

/** Without a token Recordist answers only `ok` and its version; with one, the recording state too. */
export function health(): Promise<Health> {
  const token = readToken();
  return request<Health>("GET", "/v1/health", undefined, { auth: token !== null });
}

/** Recent meetings, or with `query` the meetings whose words match it (Recordist's full-text search). */
export async function listMeetings(query: string, limit = 50): Promise<MeetingSummary[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query.trim()) params.set("q", query.trim());
  const res = await request<{ meetings?: MeetingSummary[] }>("GET", `/v1/meetings?${params.toString()}`);
  return res.meetings ?? [];
}

export function getMeeting(id: string): Promise<Meeting> {
  return request<Meeting>("GET", `/v1/meetings/${encodeURIComponent(id)}`);
}

export async function getTranscript(id: string): Promise<Segment[]> {
  const res = await request<{ segments?: Segment[] }>(
    "GET",
    `/v1/meetings/${encodeURIComponent(id)}/transcript?format=json`,
  );
  return res.segments ?? [];
}

/** The meeting as Recordist's own Markdown export: notes, action items and transcript. */
export function getMeetingMarkdown(id: string): Promise<string> {
  return request<string>("GET", `/v1/meetings/${encodeURIComponent(id)}/transcript?format=md`, undefined, {
    text: true,
  });
}

/** "manual" is the source Recordist uses for a recording someone asked for by hand; "user" marks a deliberate press. */
const BY_HAND = { source_app: "manual", intent: "user" };

/** Starts at once. Recordist refuses (403) unless "Allow agents to start recordings" is on. */
export function startRecording(): Promise<unknown> {
  return request("POST", "/v1/recording/start", { source_app: "manual" });
}

/** Brings up Recordist's own card. Nothing records until the person answers it there. */
export function askToRecord(): Promise<PromptAnswer> {
  return request<PromptAnswer>("POST", "/v1/recording/prompt", BY_HAND);
}

export function stopRecording(): Promise<unknown> {
  return request("POST", "/v1/recording/stop", {});
}

export function addMarker(label?: string): Promise<unknown> {
  return request("POST", "/v1/recording/marker", label ? { label } : {});
}

/** Recordist answers 400 "No recording is running." to a stop or a marker with nothing recording. */
export const isNothingRecording = (err: unknown): boolean =>
  err instanceof RecordistApiError && err.status === 400 && /no recording/i.test(err.message);

/** Recordist answers 400 "A recording is already running." (or "already starting") to a start a moment late. */
export const isAlreadyRecording = (err: unknown): boolean =>
  err instanceof RecordistApiError && err.status === 400 && /already (running|starting)/i.test(err.message);
