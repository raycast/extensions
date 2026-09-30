import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";

const execFileAsync = promisify(execFile);

type SqliteJsonValue = string | number | null;
type BaseModeKind = "dictation" | "ask-anything" | "translation";
type OriginalModeKind = BaseModeKind | "other";

export type TypelessModeKind = OriginalModeKind | "no-transcript";
export type QuickTranscriptMode = "latest" | BaseModeKind;

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

export async function getLatestHistoryRow(
  mode: QuickTranscriptMode = "latest",
) {
  const dbPath = getDatabasePath();
  const rows = await sqliteJson<RawHistoryRow>(
    dbPath,
    latestHistoryRowQuery(mode),
  );
  return rows[0] ? normalizeRow(rows[0]) : null;
}

export function hasTranscript(row: TypelessHistoryRow) {
  return visibleText(row.transcript).length > 0;
}

export function hasNoTranscript(row: TypelessHistoryRow) {
  return !hasTranscript(row);
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

export function formatCharacterCount(count: number) {
  return `${new Intl.NumberFormat().format(count)} ${count === 1 ? "char" : "chars"}`;
}

export function quickModeLabel(mode: QuickTranscriptMode) {
  switch (mode) {
    case "latest":
      return "Typeless transcript";
    case "dictation":
      return "Dictation";
    case "ask-anything":
      return "Ask Anything";
    case "translation":
      return "Translation";
  }
}

export function statusLabel(row: TypelessHistoryRow) {
  if (hasTranscript(row)) return row.status || "completed";
  if (row.status && row.status !== "completed") return row.status;
  return "no transcript";
}

export function modeKind(row: TypelessHistoryRow): TypelessModeKind {
  return hasNoTranscript(row) ? "no-transcript" : originalModeKind(row);
}

export function originalModeKind(row: TypelessHistoryRow): OriginalModeKind {
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
    case "no-transcript":
      return "No Transcript";
    case "other":
      return row.mode || "Other";
  }
}

export function originalModeLabel(row: TypelessHistoryRow) {
  switch (originalModeKind(row)) {
    case "dictation":
      return "Dictation";
    case "ask-anything":
      return "Ask Anything";
    case "translation":
      return "Translation";
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
  if (hasNoTranscript(row)) return noTranscriptTitle(row);
  if (row.askPrompt) return singleLine(row.askPrompt);
  return singleLine(row.transcript);
}

export function noTranscriptTitle(row: TypelessHistoryRow) {
  if (row.status === "dismissed") return "Transcription dismissed.";
  if (row.status === "error") return "Transcription failed.";
  return "No transcript saved.";
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
  const rowTranscript = stringValue(row.transcript);
  const transcript = visibleText(rowTranscript)
    ? rowTranscript
    : askAnswer || rowTranscript;

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
    textLength: visibleText(transcript).length,
    duration: nullableNumber(row.duration),
    createdAt: nullableString(row.createdAt),
    updatedAt: nullableString(row.updatedAt),
    audioPath: nullableString(row.audioPath),
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

function visibleText(value: string) {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

function singleLine(value: string) {
  return visibleText(value).replace(/\s+/g, " ");
}

const normalizedHistoryCte = `
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
    focused_app_name AS focusedAppName,
    focused_app_window_title AS focusedWindowTitle
  FROM history
)
`;

const historyColumns = `
SELECT
  id,
  source,
  status,
  mode,
  modeMeta,
  coalesce(transcript, '') AS transcript,
  duration,
  createdAt,
  updatedAt,
  audioPath,
  focusedAppName,
  focusedWindowTitle
FROM normalized
`;

const historyOrder = `
ORDER BY
  coalesce(createdAt, updatedAt) DESC,
  coalesce(updatedAt, createdAt) DESC,
  source DESC
`;

const historyQuery = `
${normalizedHistoryCte}
${historyColumns}
${historyOrder};
`;

function latestHistoryRowQuery(mode: QuickTranscriptMode) {
  const whereClause = latestModeWhereClause(mode);

  return `
${normalizedHistoryCte}
${historyColumns}
${whereClause ? `WHERE ${whereClause}` : ""}
${historyOrder}
LIMIT 1;
`;
}

function latestModeWhereClause(mode: QuickTranscriptMode) {
  switch (mode) {
    case "latest":
      return "";
    case "dictation":
      return "lower(mode) = 'voice_transcript'";
    case "ask-anything":
      return [
        "lower(mode) = 'voice_command'",
        "lower(mode) LIKE '%ask%'",
        "lower(CAST(modeMeta AS TEXT)) LIKE '%user_prompt%'",
        "lower(CAST(modeMeta AS TEXT)) LIKE '%selected_text%'",
      ].join(" OR ");
    case "translation":
      return [
        "lower(mode) LIKE '%translation%'",
        "lower(mode) LIKE '%translate%'",
      ].join(" OR ");
  }
}
