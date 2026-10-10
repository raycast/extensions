import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  ColumnInfo,
  Connection,
  ConnectionStatus,
  DatabaseInfo,
  MCPNotRunningError,
  MCPSessionExpiredError,
  ProgressEvent,
  QueryHistoryEntry,
  QueryResult,
  RecentTab,
  SchemaInfo,
  ServerUnreachableError,
  TableInfo,
  TokenMissingError,
} from "./types";
import {
  assertInstalledVersionSupported,
  assertSupportedVersion,
  requireTablePro,
} from "./app";
import {
  CLIENT_NAME,
  CLIENT_VERSION,
  VerifiedEndpoint,
  mcpPort,
  verifiedEndpoint,
} from "./endpoint";
import { parseToolError, translateError } from "./protocol";
import { readStoredApiToken } from "./storage";

export type { ProgressEvent } from "./types";

const DEFAULT_ROW_LIMIT = 200;
const PAIRING_EXCHANGE_TIMEOUT_MS = 10_000;

export interface MCPCallOptions {
  signal?: AbortSignal;
  onProgress?: (progress: ProgressEvent) => void;
}

export interface SearchHistoryOptions {
  since?: number;
  until?: number;
  signal?: AbortSignal;
}

let clientPromise: Promise<Client> | null = null;

async function getClient(): Promise<Client> {
  if (clientPromise) return clientPromise;
  const promise: Promise<Client> = createClient(() => {
    if (clientPromise === promise) resetClient();
  });
  clientPromise = promise;
  promise.catch(() => {
    if (clientPromise === promise) clientPromise = null;
  });
  return promise;
}

export function resetClient(): void {
  const previous = clientPromise;
  clientPromise = null;
  if (!previous) return;
  previous
    .then((client) => client.close().catch(() => undefined))
    .catch(() => undefined);
}

async function createClient(onClose: () => void): Promise<Client> {
  const app = await requireTablePro();
  await assertInstalledVersionSupported(app);
  const token = await getApiToken();
  const server = await verifiedEndpoint({ allowAutoStart: true });
  const transport = new StreamableHTTPClientTransport(
    new URL(server.mcpUrl),
    server.anonymous
      ? undefined
      : { requestInit: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const client = new Client(
    { name: CLIENT_NAME, version: CLIENT_VERSION },
    { capabilities: {} },
  );
  try {
    await client.connect(transport);
  } catch (err) {
    await transport.close().catch(() => undefined);
    throw translateError(err);
  }
  try {
    assertTableProServer(client, server);
  } catch (err) {
    await client.close().catch(() => undefined);
    throw err;
  }
  // No transport.onerror reset: closing there fails a 403 call as "Connection closed".
  client.onclose = onClose;
  return client;
}

function assertTableProServer(client: Client, server: VerifiedEndpoint): void {
  const info = client.getServerVersion();
  if (info?.name !== "tablepro") throw new ServerUnreachableError(server.port);
  assertSupportedVersion(info.version);
}

export async function readApiToken(): Promise<string | undefined> {
  return readStoredApiToken();
}

async function getApiToken(): Promise<string> {
  const token = await readApiToken();
  if (!token) throw new TokenMissingError();
  return token;
}

interface ToolContent {
  type: string;
  text?: string;
  data?: unknown;
}

interface ToolCallEnvelope {
  content?: ToolContent[];
  structuredContent?: unknown;
  isError?: boolean;
}

function parseToolResult<T>(envelope: ToolCallEnvelope): T {
  if (envelope.isError) {
    const text = envelope.content?.find((item) => item.type === "text")?.text;
    throw parseToolError(text);
  }
  if (envelope.structuredContent !== undefined)
    return envelope.structuredContent as T;
  const first = envelope.content?.[0];
  if (!first) return undefined as T;
  if (first.data !== undefined) return first.data as T;
  if (first.text !== undefined) {
    try {
      return JSON.parse(first.text) as T;
    } catch {
      return first.text as unknown as T;
    }
  }
  return undefined as T;
}

async function callTool<T>(
  name: string,
  args: Record<string, unknown>,
  options: MCPCallOptions = {},
  idempotent = false,
): Promise<T> {
  return invokeTool(name, args, options, idempotent, false);
}

async function invokeTool<T>(
  name: string,
  args: Record<string, unknown>,
  options: MCPCallOptions,
  idempotent: boolean,
  retried: boolean,
): Promise<T> {
  let client: Client;
  try {
    client = await getClient();
  } catch (err) {
    throw translateError(err);
  }
  let envelope: ToolCallEnvelope;
  try {
    const onProgress = options.onProgress;
    envelope = (await client.callTool({ name, arguments: args }, undefined, {
      signal: options.signal,
      onprogress: onProgress
        ? (progress) =>
            onProgress({
              progress: progress.progress,
              total: progress.total,
              message: progress.message,
            })
        : undefined,
    })) as ToolCallEnvelope;
  } catch (err) {
    const translated = translateError(err);
    if (!isSessionLost(translated)) throw translated;
    resetClient();
    if (!idempotent || retried) throw translated;
    return invokeTool<T>(name, args, options, idempotent, true);
  }
  return parseToolResult<T>(envelope);
}

function isSessionLost(err: Error): boolean {
  return (
    err instanceof MCPSessionExpiredError || err instanceof MCPNotRunningError
  );
}

function pruneArgs(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
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

export async function listConnections(
  options: MCPCallOptions = {},
): Promise<Connection[]> {
  const envelope = await callTool<{ connections: RawConnectionRow[] }>(
    "list_connections",
    {},
    options,
    true,
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

interface RawConnectionStatus {
  status: ConnectionStatus["status"];
  current_database?: string;
  current_schema?: string;
  server_version?: string;
  connected_at?: string;
  last_active_at?: string;
  error?: { message?: string };
}

export async function getConnectionStatus(
  connectionId: string,
  options: MCPCallOptions = {},
): Promise<ConnectionStatus> {
  const raw = await callTool<RawConnectionStatus>(
    "get_connection_status",
    { connection_id: connectionId },
    options,
    true,
  );
  return {
    status: raw.status,
    currentDatabase: raw.current_database,
    currentSchema: raw.current_schema,
    serverVersion: raw.server_version,
    connectedAt: raw.connected_at,
    lastActiveAt: raw.last_active_at,
    errorMessage: raw.error?.message,
  };
}

export async function listDatabases(
  connectionId: string,
  options: MCPCallOptions = {},
): Promise<DatabaseInfo[]> {
  const envelope = await callTool<{ databases: string[] }>(
    "list_databases",
    { connection_id: connectionId },
    options,
    true,
  );
  return (envelope.databases ?? []).map((name) => ({ name }));
}

export async function listSchemas(
  connectionId: string,
  options: { database?: string; signal?: AbortSignal } = {},
): Promise<SchemaInfo[]> {
  const envelope = await callTool<{ schemas: string[] }>(
    "list_schemas",
    pruneArgs({ connection_id: connectionId, database: options.database }),
    { signal: options.signal },
    true,
  );
  return (envelope.schemas ?? []).map((name) => ({
    name,
    database: options.database,
  }));
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
  options: { database?: string; schema?: string; signal?: AbortSignal } = {},
): Promise<TableInfo[]> {
  const envelope = await callTool<{ tables: RawTableRow[] }>(
    "list_tables",
    pruneArgs({
      connection_id: connectionId,
      database: options.database,
      schema: options.schema,
      include_row_counts: true,
    }),
    { signal: options.signal },
    true,
  );
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
}

export async function describeTable(
  connectionId: string,
  table: string,
  options: { schema?: string; signal?: AbortSignal } = {},
): Promise<{ columns: ColumnInfo[] }> {
  const envelope = await callTool<RawDescribeTable>(
    "describe_table",
    pruneArgs({ connection_id: connectionId, table, schema: options.schema }),
    { signal: options.signal },
    true,
  );
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
  options: { schema?: string; signal?: AbortSignal } = {},
): Promise<{ ddl: string }> {
  return callTool<{ ddl: string }>(
    "get_table_ddl",
    pruneArgs({ connection_id: connectionId, table, schema: options.schema }),
    { signal: options.signal },
    true,
  );
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
  options: {
    database?: string;
    schema?: string;
    rowLimit?: number;
    signal?: AbortSignal;
    onProgress?: (progress: ProgressEvent) => void;
  } = {},
): Promise<QueryResult> {
  const raw = await callTool<RawQueryResult>(
    "execute_query",
    pruneArgs({
      connection_id: connectionId,
      query: sql,
      database: options.database,
      schema: options.schema,
      max_rows: options.rowLimit ?? DEFAULT_ROW_LIMIT,
    }),
    { signal: options.signal, onProgress: options.onProgress },
  );
  return adaptQueryResult(raw);
}

export async function explainQuery(
  connectionId: string,
  sql: string,
  options: {
    database?: string;
    schema?: string;
    signal?: AbortSignal;
    onProgress?: (progress: ProgressEvent) => void;
  } = {},
): Promise<QueryResult> {
  const raw = await callTool<RawQueryResult>(
    "execute_query",
    pruneArgs({
      connection_id: connectionId,
      query: `EXPLAIN ${sql}`,
      database: options.database,
      schema: options.schema,
    }),
    { signal: options.signal, onProgress: options.onProgress },
  );
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

export async function listRecentTabs(
  options: MCPCallOptions = {},
): Promise<RecentTab[]> {
  const envelope = await callTool<{ tabs: RawRecentTab[] }>(
    "list_recent_tabs",
    {},
    options,
    true,
  );
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

export async function searchHistory(
  query: string,
  limit = 50,
  options: SearchHistoryOptions = {},
): Promise<QueryHistoryEntry[]> {
  const envelope = await callTool<{ entries: RawHistoryEntry[] }>(
    "search_query_history",
    pruneArgs({ query, limit, since: options.since, until: options.until }),
    { signal: options.signal },
    true,
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
  options: MCPCallOptions = {},
): Promise<void> {
  await callTool<unknown>(
    "open_connection_window",
    { connection_id: connectionId },
    options,
  );
}

export async function exchangePairingCode(
  code: string,
  codeVerifier: string,
  options: MCPCallOptions = {},
): Promise<{ token: string }> {
  let server: VerifiedEndpoint;
  try {
    server = await verifiedEndpoint({
      allowAutoStart: false,
      signal: options.signal,
    });
  } catch (err) {
    // The approval sheet already started the server, so a refusal means the port is wrong.
    if (err instanceof MCPNotRunningError) {
      throw new ServerUnreachableError(mcpPort());
    }
    throw err;
  }
  const signal = combineSignals(
    options.signal,
    AbortSignal.timeout(PAIRING_EXCHANGE_TIMEOUT_MS),
  );
  let response: Response;
  try {
    response = await fetch(server.exchangeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, code_verifier: codeVerifier }),
      redirect: "manual",
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new ServerUnreachableError(server.port);
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Pairing exchange failed: ${text || `HTTP ${response.status}`}`,
    );
  }
  const json = (await response.json()) as { token?: string };
  if (!json.token) throw new Error("Pairing exchange returned no token");
  return { token: json.token };
}

function combineSignals(
  ...signals: Array<AbortSignal | undefined>
): AbortSignal {
  const present = signals.filter((s): s is AbortSignal => s !== undefined);
  return present.length === 1 ? present[0]! : AbortSignal.any(present);
}
