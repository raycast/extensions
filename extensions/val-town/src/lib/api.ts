import { callTool, callToolVoid } from "./mcp";
import type {
  Privacy,
  FindSkillsResponse,
  HistoryResponse,
  IntervalSettings,
  ListBlobsResponse,
  ListFilesResponse,
  ListOrgsResponse,
  ListValsResponse,
  LogsResponse,
  ReadBlobResponse,
  ReadFileResponse,
  RunFileResponse,
  SqliteResponse,
  TracesResponse,
  ValDetailResponse,
  ValFile,
} from "./types";

export type BlobStorage = { type: "val"; val: string } | { type: "deprecated_global"; org: string };

type ListValsOptions = {
  name?: string;
  updatedAfter?: string;
  limit?: number;
  sortBy?: "updated" | "created" | "name";
};

export function listVals(options: ListValsOptions = {}, signal?: AbortSignal) {
  return callTool<ListValsResponse>("list_vals", { limit: 100, sortBy: "updated", ...stripEmpty(options) }, signal);
}

/**
 * Code visibility is the only access axis this extension changes. App access is read and shown but
 * never set: 'restricted' requires a business plan, so the control would fail for most accounts.
 * Non-public code needs pro or business, and Val Town rejects rather than failing quietly.
 */
export function setPrivacy(val: string, privacy: Privacy) {
  return callToolVoid("update_val", { val, privacy });
}

export function findSkills(query: string, limit = 5, signal?: AbortSignal) {
  return callTool<FindSkillsResponse>("find_val_town_skills", { query, limit }, signal);
}

export function getValDetail(val: string, signal?: AbortSignal) {
  return callTool<ValDetailResponse>("get_val_detail", { val }, signal);
}

export function listFiles(val: string, options: { branch?: string; path?: string } = {}, signal?: AbortSignal) {
  return callTool<ListFilesResponse>("list_files", { val, ...stripEmpty(options) }, signal);
}

export function readFile(val: string, path: string, options: { branch?: string } = {}, signal?: AbortSignal) {
  return callTool<ReadFileResponse>(
    "read_file",
    { val, path, show_line_numbers: false, ...stripEmpty(options) },
    signal,
  );
}

export function getLogs(fileId: string, options: { end?: string; traceIds?: string[] } = {}, signal?: AbortSignal) {
  return callTool<LogsResponse>("get_logs", { fileId, ...stripEmpty(options) }, signal);
}

export function getTraces(fileId: string, signal?: AbortSignal) {
  return callTool<TracesResponse>("get_traces", { fileId }, signal);
}

export function readIntervalSettings(
  val: string,
  path: string,
  options: { branch?: string } = {},
  signal?: AbortSignal,
) {
  return callTool<IntervalSettings>("read_interval_settings", { val, path, ...stripEmpty(options) }, signal);
}

export function getValHistory(val: string, options: { branch?: string; limit?: number } = {}, signal?: AbortSignal) {
  return callTool<HistoryResponse>("get_val_history", { val, limit: 50, ...stripEmpty(options) }, signal);
}

export function runFile(val: string, path: string, options: { branch?: string } = {}) {
  return callTool<RunFileResponse>("run_file", { val, path, ...stripEmpty(options) });
}

export function sqliteExecute(val: string, sql: string, signal?: AbortSignal) {
  return callTool<SqliteResponse>("sqlite_execute", { sql, database: { type: "val", val } }, signal);
}

export function listBlobs(storage: BlobStorage, prefix?: string, signal?: AbortSignal) {
  return callTool<ListBlobsResponse>("listBlobs", { storage, ...stripEmpty({ prefix }) }, signal);
}

export function readBlob(storage: BlobStorage, key: string, signal?: AbortSignal) {
  return callTool<ReadBlobResponse>("readBlob", { key, storage }, signal);
}

export function storeBlob(storage: BlobStorage, key: string, content: string) {
  return callToolVoid("storeBlob", { key, content, storage });
}

export function listOrgs(signal?: AbortSignal) {
  return callTool<ListOrgsResponse>("list_orgs", {}, signal);
}

/** Older responses nested the deployed URL under `links` instead of at the top level. */
export function endpointOf(file: ValFile): string | undefined {
  return file.endpoint ?? file.links?.endpoint;
}

export function webUrlFor(val: string, path?: string): string {
  const base = `https://www.val.town/x/${val}/code`;
  return path ? `${base}/${path}` : `${base}/`;
}

function stripEmpty<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== ""),
  ) as Partial<T>;
}
