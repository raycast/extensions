import { promises as fs } from "fs";
import {
  ColumnInfo,
  Connection,
  DatabaseInfo,
  MCPHandshake,
  MCPNotRunningError,
  QueryHistoryEntry,
  QueryResult,
  RecentTab,
  SchemaInfo,
  TableInfo,
  TableProNotInstalledError,
  TokenMissingError,
  TokenRevokedError,
  ExternalAccessDeniedError,
} from "./types";
import { handshakeFilePath, tableProInstalled } from "./paths";
import { startMCPDeeplink } from "./deeplink";
import { LocalStorage } from "@raycast/api";
import { STORAGE_KEYS } from "./pairing";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params?: unknown;
}

interface JsonRpcSuccess<T> {
  jsonrpc: "2.0";
  id: string;
  result: T;
}

interface JsonRpcError {
  jsonrpc: "2.0";
  id: string;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcError;

interface InitializeResult {
  protocolVersion: string;
}

async function readHandshake(): Promise<MCPHandshake | null> {
  try {
    const raw = await fs.readFile(handshakeFilePath(), "utf8");
    const parsed = JSON.parse(raw) as MCPHandshake;
    if (typeof parsed.port !== "number" || typeof parsed.token !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

const HANDSHAKE_RETRY_DELAY_MS = 600;
const HANDSHAKE_MAX_RETRIES = 12;

async function ensureHandshake(allowAutoStart: boolean): Promise<MCPHandshake> {
  if (!tableProInstalled()) {
    throw new TableProNotInstalledError();
  }
  const existing = await readHandshake();
  if (existing) return existing;
  if (!allowAutoStart) {
    throw new MCPNotRunningError();
  }
  await startMCPDeeplink();
  for (let attempt = 0; attempt < HANDSHAKE_MAX_RETRIES; attempt += 1) {
    await new Promise((resolve) =>
      setTimeout(resolve, HANDSHAKE_RETRY_DELAY_MS),
    );
    const handshake = await readHandshake();
    if (handshake) return handshake;
  }
  throw new MCPNotRunningError();
}

async function clearStaleHandshake(): Promise<void> {
  try {
    await fs.unlink(handshakeFilePath());
  } catch {
    // ignore
  }
}

export async function readApiToken(): Promise<string | undefined> {
  const value = await LocalStorage.getItem<string>(STORAGE_KEYS.apiToken);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

async function getApiToken(): Promise<string> {
  const token = await readApiToken();
  if (!token) {
    throw new TokenMissingError();
  }
  return token;
}

let requestCounter = 0;
function nextRequestId(): string {
  requestCounter += 1;
  return `tp-${Date.now()}-${requestCounter}`;
}

interface SessionState {
  sessionId: string;
  initialized: boolean;
}

let sessionState: SessionState | null = null;
let sessionInFlight: Promise<string> | null = null;

function resetSession(): void {
  sessionState = null;
  sessionInFlight = null;
}

function mcpUrl(handshake: MCPHandshake): string {
  return `http${handshake.tls ? "s" : ""}://127.0.0.1:${handshake.port}/mcp`;
}

async function postJsonRpc<T>(
  method: string,
  params: Record<string, unknown> | undefined,
  handshake: MCPHandshake,
  token: string,
  sessionId: string | null,
): Promise<{ result: T; sessionId: string | null }> {
  const body: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: nextRequestId(),
    method,
    params,
  };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (sessionId) {
    headers["Mcp-Session-Id"] = sessionId;
  }
  let response: Response;
  try {
    response = await fetch(mcpUrl(handshake), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new MCPNotRunningError();
  }
  if (response.status === 401) {
    resetSession();
    throw new TokenRevokedError();
  }
  if (response.status === 403) {
    const message = await safeReadError(response);
    throw new ExternalAccessDeniedError(message);
  }
  if (response.status === 404) {
    resetSession();
    throw new Error(`TablePro MCP returned HTTP 404`);
  }
  if (!response.ok) {
    throw new Error(`TablePro MCP returned HTTP ${response.status}`);
  }
  const responseSessionId = response.headers.get("mcp-session-id");
  if (response.status === 202) {
    return { result: undefined as T, sessionId: responseSessionId };
  }
  const text = await response.text();
  if (!text) {
    return { result: undefined as T, sessionId: responseSessionId };
  }
  const json = JSON.parse(text) as JsonRpcResponse<T>;
  if ("error" in json) {
    const message = json.error.message;
    if (
      message.toLowerCase().includes("read-only") ||
      message.toLowerCase().includes("read only")
    ) {
      throw new ExternalAccessDeniedError(message);
    }
    throw new Error(message);
  }
  return { result: json.result, sessionId: responseSessionId };
}

async function ensureSession(
  handshake: MCPHandshake,
  token: string,
): Promise<string> {
  if (sessionState && sessionState.initialized) {
    return sessionState.sessionId;
  }
  if (sessionInFlight) {
    return sessionInFlight;
  }
  sessionInFlight = (async () => {
    const initParams = {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "raycast-tablepro", version: "0.1.0" },
    };
    const init = await postJsonRpc<InitializeResult>(
      "initialize",
      initParams,
      handshake,
      token,
      null,
    );
    if (!init.sessionId) {
      throw new Error("MCP initialize did not return a session id");
    }
    sessionState = { sessionId: init.sessionId, initialized: false };
    await postJsonRpc<unknown>(
      "notifications/initialized",
      {},
      handshake,
      token,
      init.sessionId,
    );
    sessionState.initialized = true;
    return init.sessionId;
  })();
  try {
    return await sessionInFlight;
  } finally {
    sessionInFlight = null;
  }
}

async function rpc<T>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const token = await getApiToken();
  let handshake = await ensureHandshake(true);
  let sessionId: string;
  try {
    sessionId = await ensureSession(handshake, token);
  } catch (err) {
    resetSession();
    if (err instanceof MCPNotRunningError) {
      await clearStaleHandshake();
      handshake = await ensureHandshake(true);
      sessionId = await ensureSession(handshake, token);
    } else {
      throw err;
    }
  }
  try {
    const { result } = await postJsonRpc<T>(
      method,
      params,
      handshake,
      token,
      sessionId,
    );
    return result;
  } catch (err) {
    if (err instanceof Error && /HTTP 404/.test(err.message)) {
      resetSession();
      const fresh = await ensureSession(handshake, token);
      const { result } = await postJsonRpc<T>(
        method,
        params,
        handshake,
        token,
        fresh,
      );
      return result;
    }
    if (err instanceof MCPNotRunningError) {
      resetSession();
      await clearStaleHandshake();
      handshake = await ensureHandshake(true);
      const fresh = await ensureSession(handshake, token);
      const { result } = await postJsonRpc<T>(
        method,
        params,
        handshake,
        token,
        fresh,
      );
      return result;
    }
    throw err;
  }
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export async function callTool<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const result = await rpc<{
    content: Array<{ type: string; text?: string; data?: unknown }>;
  }>("tools/call", {
    name,
    arguments: args,
  });
  const first = result.content?.[0];
  if (!first) {
    return undefined as T;
  }
  if (first.data !== undefined) {
    return first.data as T;
  }
  if (first.text !== undefined) {
    try {
      return JSON.parse(first.text) as T;
    } catch {
      return first.text as unknown as T;
    }
  }
  return undefined as T;
}

interface RawConnectionRow {
  id: string;
  name: string;
  type: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  is_connected?: boolean;
  ai_policy?: string;
  safe_mode?: string;
}

export async function listConnections(): Promise<Connection[]> {
  const envelope = await callTool<{ connections: RawConnectionRow[] }>(
    "list_connections",
  );
  return (envelope.connections ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    host: row.host,
    port: row.port,
    database: row.database,
  }));
}

export async function listDatabases(
  connectionId: string,
): Promise<DatabaseInfo[]> {
  const envelope = await callTool<{ databases: string[] }>("list_databases", {
    connection_id: connectionId,
  });
  return (envelope.databases ?? []).map((name) => ({ name }));
}

export async function listSchemas(
  connectionId: string,
  database?: string,
): Promise<SchemaInfo[]> {
  const envelope = await callTool<{ schemas: string[] }>("list_schemas", {
    connection_id: connectionId,
    database,
  });
  return (envelope.schemas ?? []).map((name) => ({ name, database }));
}

interface RawTableRow {
  name: string;
  type?: string;
  schema?: string;
  database?: string;
  row_count?: number;
}

export async function listTables(
  connectionId: string,
  options: { database?: string; schema?: string } = {},
): Promise<TableInfo[]> {
  const envelope = await callTool<{ tables: RawTableRow[] }>("list_tables", {
    connection_id: connectionId,
    database: options.database,
    schema: options.schema,
    include_row_counts: true,
  });
  return (envelope.tables ?? []).map((row) => ({
    name: row.name,
    type: row.type,
    schema: row.schema,
    database: row.database,
    rowCount: row.row_count,
  }));
}

interface RawColumn {
  name: string;
  data_type: string;
  is_nullable: boolean;
  is_primary_key: boolean;
  default_value?: string | null;
  extra?: string | null;
  comment?: string | null;
}

interface RawDescribeTable {
  columns: RawColumn[];
  indexes?: unknown[];
  foreign_keys?: unknown[];
  ddl?: string;
  approximate_row_count?: number;
}

export async function describeTable(
  connectionId: string,
  table: string,
  options: { schema?: string } = {},
): Promise<{ columns: ColumnInfo[] }> {
  const envelope = await callTool<RawDescribeTable>("describe_table", {
    connection_id: connectionId,
    table,
    schema: options.schema,
  });
  const columns: ColumnInfo[] = (envelope.columns ?? []).map((col) => ({
    name: col.name,
    type: col.data_type,
    nullable: col.is_nullable,
    primaryKey: col.is_primary_key,
    defaultValue: col.default_value ?? undefined,
    comment: col.comment ?? undefined,
  }));
  return { columns };
}

export async function getTableDDL(
  connectionId: string,
  table: string,
  options: { schema?: string } = {},
): Promise<{ ddl: string }> {
  return callTool<{ ddl: string }>("get_table_ddl", {
    connection_id: connectionId,
    table,
    schema: options.schema,
  });
}

interface RawQueryResult {
  columns: string[];
  rows: Array<Array<string | null>>;
  row_count: number;
  rows_affected: number;
  execution_time_ms: number;
  is_truncated: boolean;
  status_message?: string;
}

function adaptQueryResult(raw: RawQueryResult): QueryResult {
  const rows: Array<Record<string, unknown>> = (raw.rows ?? []).map((row) => {
    const obj: Record<string, unknown> = {};
    raw.columns.forEach((col, idx) => {
      obj[col] = row[idx] ?? null;
    });
    return obj;
  });
  return {
    columns: raw.columns ?? [],
    rows,
    affectedRows: raw.rows_affected,
    durationMs: raw.execution_time_ms,
    isTruncated: raw.is_truncated,
    statusMessage: raw.status_message,
  };
}

export async function executeQuery(
  connectionId: string,
  sql: string,
  options: { database?: string; schema?: string; rowLimit?: number } = {},
): Promise<QueryResult> {
  const raw = await callTool<RawQueryResult>("execute_query", {
    connection_id: connectionId,
    query: sql,
    database: options.database,
    schema: options.schema,
    max_rows: options.rowLimit,
  });
  return adaptQueryResult(raw);
}

export async function explainQuery(
  connectionId: string,
  sql: string,
  options: { database?: string; schema?: string } = {},
): Promise<QueryResult> {
  const raw = await callTool<RawQueryResult>("execute_query", {
    connection_id: connectionId,
    query: `EXPLAIN ${sql}`,
    database: options.database,
    schema: options.schema,
  });
  return adaptQueryResult(raw);
}

interface RawRecentTab {
  tab_id: string;
  connection_id: string;
  connection_name: string;
  tab_type: string;
  display_title: string;
  is_active: boolean;
  table_name?: string;
  database_name?: string;
  schema_name?: string;
  window_id?: string;
  updated_at?: number;
}

function tabTypeFromRaw(raw: string): RecentTab["tabType"] {
  if (raw === "table") return "table";
  if (raw === "createTable") return "structure";
  return "query";
}

export async function listRecentTabs(): Promise<RecentTab[]> {
  const envelope = await callTool<{ tabs: RawRecentTab[] }>("list_recent_tabs");
  return (envelope.tabs ?? []).map((tab) => ({
    id: tab.tab_id,
    connectionId: tab.connection_id,
    connectionName: tab.connection_name,
    tabType: tabTypeFromRaw(tab.tab_type),
    title: tab.display_title,
    tableName: tab.table_name,
    databaseName: tab.database_name,
    schemaName: tab.schema_name,
    updatedAt:
      typeof tab.updated_at === "number"
        ? new Date(tab.updated_at * 1000).toISOString()
        : undefined,
  }));
}

interface RawHistoryEntry {
  id: string;
  query: string;
  connection_id: string;
  connection_name?: string;
  database_name?: string;
  executed_at: number;
  execution_time_ms: number;
  row_count: number;
  was_successful: boolean;
  error_message?: string;
}

export interface SearchHistoryOptions {
  /** Earliest executed_at to include, Unix epoch seconds (inclusive). */
  since?: number;
  /** Latest executed_at to include, Unix epoch seconds (inclusive). */
  until?: number;
}

export async function searchHistory(
  query: string,
  limit = 50,
  options: SearchHistoryOptions = {},
): Promise<QueryHistoryEntry[]> {
  const args: Record<string, unknown> = {
    query,
    limit,
  };
  if (options.since !== undefined) {
    args.since = options.since;
  }
  if (options.until !== undefined) {
    args.until = options.until;
  }
  const envelope = await callTool<{ entries: RawHistoryEntry[] }>(
    "search_query_history",
    args,
  );
  return (envelope.entries ?? []).map((entry) => ({
    id: entry.id,
    query: entry.query,
    connectionId: entry.connection_id,
    connectionName: entry.connection_name,
    executedAt: new Date(entry.executed_at * 1000).toISOString(),
    durationMs: entry.execution_time_ms,
    rowCount: entry.row_count,
  }));
}

export async function openConnectionWindow(
  connectionId: string,
): Promise<void> {
  await callTool<unknown>("open_connection_window", {
    connection_id: connectionId,
  });
}

export async function exchangePairingCode(
  code: string,
  codeVerifier: string,
): Promise<{ token: string }> {
  const handshake = await ensureHandshake(false);
  const url = `http${handshake.tls ? "s" : ""}://127.0.0.1:${handshake.port}/v1/integrations/exchange`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, code_verifier: codeVerifier }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    const text = await safeReadError(response);
    throw new Error(`Pairing exchange failed: ${text}`);
  }
  const json = (await response.json()) as { token?: string };
  if (!json.token) {
    throw new Error("Pairing exchange returned no token");
  }
  return { token: json.token };
}
