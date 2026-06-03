import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";

const execFileAsync = promisify(execFile);

type SqliteJsonValue = string | number | null;

export type TypelessModeKind =
  | "dictation"
  | "ask-anything"
  | "translation"
  | "retry"
  | "other";

export type TypelessHistoryRow = {
  id: string;
  source: "history_v2" | "history";
  status: string | null;
  mode: string;
  selectedText: string | null;
  askPrompt: string | null;
  askAnswer: string | null;
  delivery: string | null;
  transcript: string;
  textLength: number;
  duration: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  audioPath: string | null;
  appVersion: string | null;
  focusedAppName: string | null;
  focusedWindowTitle: string | null;
};

type RawHistoryRow = Record<string, SqliteJsonValue>;

const defaultDatabasePath =
  "~/Library/Application Support/Typeless/typeless.db";

export function getDatabasePath() {
  const preferences = getPreferenceValues<Preferences>();
  return expandHome(preferences.databasePath?.trim() || defaultDatabasePath);
}

export function databaseExists() {
  return existsSync(getDatabasePath());
}

export async function listHistory() {
  const dbPath = getDatabasePath();
  const rows = await sqliteJson<RawHistoryRow>(dbPath, historyQuery);
  return rows.map(normalizeRow);
}

export async function getLatestTranscript() {
  const rows = await listHistory();
  return (
    rows.find((row) => modeKind(row) === "dictation" && hasTranscript(row)) ??
    rows.find((row) => hasTranscript(row)) ??
    null
  );
}

export function hasTranscript(row: TypelessHistoryRow) {
  return row.transcript.trim().length > 0;
}

export function needsRetry(row: TypelessHistoryRow) {
  return (
    !hasTranscript(row) &&
    (row.status === null || row.status === "" || row.status === "dismissed")
  );
}

export function formatDate(value: string | null) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return new Intl.DateTimeFormat(undefined, {
    month: sameDay ? undefined : "short",
    day: sameDay ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDuration(seconds: number | null) {
  if (seconds === null || Number.isNaN(seconds)) return null;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}m ${remainder}s`;
}

export function statusLabel(row: TypelessHistoryRow) {
  if (hasTranscript(row)) return row.status || "completed";
  if (needsRetry(row))
    return row.status === "dismissed" ? "dismissed" : "needs retry";
  return row.status || "unknown";
}

export function modeKind(row: TypelessHistoryRow): TypelessModeKind {
  if (needsRetry(row)) return "retry";

  const mode = row.mode.toLowerCase();
  if (mode.includes("translation") || mode.includes("translate")) {
    return "translation";
  }
  if (
    mode === "voice_command" ||
    mode.includes("ask") ||
    row.askPrompt ||
    row.selectedText
  ) {
    return "ask-anything";
  }
  if (mode === "voice_transcript") return "dictation";
  return "other";
}

export function modeLabel(row: TypelessHistoryRow) {
  switch (modeKind(row)) {
    case "dictation":
      return "Dictation";
    case "ask-anything":
      return "Ask Anything";
    case "translation":
      return "Translation";
    case "retry":
      return "Retry";
    case "other":
      return row.mode || "Other";
  }
}

export function copyLabel(row: TypelessHistoryRow) {
  switch (modeKind(row)) {
    case "ask-anything":
      return "Answer";
    case "translation":
      return "Translation";
    default:
      return "Transcript";
  }
}

export function titleForRow(row: TypelessHistoryRow) {
  if (row.askPrompt) return row.askPrompt.replace(/\s+/g, " ").trim();
  if (hasTranscript(row)) {
    return row.transcript.replace(/\s+/g, " ").trim();
  }
  if (needsRetry(row)) return "The transcription was dismissed.";
  return "No transcript saved.";
}

export async function openTypelessHistory() {
  try {
    await execFileAsync("/usr/bin/open", ["typeless://history"]);
  } catch {
    await execFileAsync("/usr/bin/open", ["-a", "Typeless"]);
  }
}

export async function revealInFinder(path: string) {
  await execFileAsync("/usr/bin/open", ["-R", path]);
}

async function sqliteJson<T>(dbPath: string, query: string) {
  if (!existsSync(dbPath)) {
    throw new Error(`Typeless database was not found at ${dbPath}`);
  }

  const { stdout } = await execFileAsync(
    "/usr/bin/sqlite3",
    ["-readonly", "-json", "-cmd", ".timeout 2000", dbPath, query],
    {
      maxBuffer: 50 * 1024 * 1024,
    },
  );

  const json = stdout.trim();
  if (!json) return [] as T[];
  return JSON.parse(json) as T[];
}

function normalizeRow(row: RawHistoryRow): TypelessHistoryRow {
  const modeMeta = stringValue(row.modeMeta);
  const parsedModeMeta = parseModeMeta(modeMeta);
  const selectedText = nullableString(parsedModeMeta.selected_text);
  const askPrompt = nullableString(parsedModeMeta.ai_result?.user_prompt);
  const askAnswer = nullableString(parsedModeMeta.ai_result?.refined_text);
  const transcript = stringValue(row.transcript) || askAnswer || "";

  return {
    id: stringValue(row.id),
    source: row.source === "history" ? "history" : "history_v2",
    status: nullableString(row.status),
    mode: stringValue(row.mode) || "voice_transcript",
    selectedText,
    askPrompt,
    askAnswer,
    delivery: nullableString(parsedModeMeta.ai_result?.delivery),
    transcript,
    textLength: transcript.length,
    duration: nullableNumber(row.duration),
    createdAt: nullableString(row.createdAt),
    updatedAt: nullableString(row.updatedAt),
    audioPath: nullableString(row.audioPath),
    appVersion: nullableString(row.appVersion),
    focusedAppName: nullableString(row.focusedAppName),
    focusedWindowTitle: nullableString(row.focusedWindowTitle),
  };
}

type ParsedModeMeta = {
  selected_text?: SqliteJsonValue;
  ai_result?: {
    user_prompt?: SqliteJsonValue;
    refined_text?: SqliteJsonValue;
    delivery?: SqliteJsonValue;
  };
};

function parseModeMeta(modeMeta: string): ParsedModeMeta {
  if (!modeMeta.trim()) return {};
  try {
    return JSON.parse(modeMeta) as ParsedModeMeta;
  } catch {
    return {};
  }
}

function expandHome(path: string) {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return `${homedir()}${path.slice(1)}`;
  return path;
}

function stringValue(value: SqliteJsonValue | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function nullableString(value: SqliteJsonValue | undefined) {
  const normalized = stringValue(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function nullableNumber(value: SqliteJsonValue | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const historyQuery = `
WITH normalized AS (
  SELECT
    id,
    'history_v2' AS source,
    status,
    coalesce(mode, 'voice_transcript') AS mode,
    mode_meta AS modeMeta,
    refined_text AS transcript,
    duration,
    created_at AS createdAt,
    updated_at AS updatedAt,
    audio_local_path AS audioPath,
    app_version AS appVersion,
    NULL AS focusedAppName,
    NULL AS focusedWindowTitle
  FROM history_v2

  UNION ALL

  SELECT
    id,
    'history' AS source,
    status,
    coalesce(mode, 'voice_transcript') AS mode,
    mode_meta AS modeMeta,
    coalesce(nullif(edited_text, ''), refined_text) AS transcript,
    duration,
    created_at AS createdAt,
    updated_at AS updatedAt,
    audio_local_path AS audioPath,
    app_version AS appVersion,
    focused_app_name AS focusedAppName,
    focused_app_window_title AS focusedWindowTitle
  FROM history
)
SELECT
  id,
  source,
  status,
  mode,
  modeMeta,
  coalesce(transcript, '') AS transcript,
  length(coalesce(transcript, '')) AS textLength,
  duration,
  createdAt,
  updatedAt,
  audioPath,
  appVersion,
  focusedAppName,
  focusedWindowTitle
FROM normalized
ORDER BY
  coalesce(createdAt, updatedAt) DESC,
  coalesce(updatedAt, createdAt) DESC,
  source DESC;
`;
