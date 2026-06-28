export type DatabaseType = string;

export interface Connection {
  id: string;
  name: string;
  type: DatabaseType;
  host?: string;
  port?: number;
  color?: string;
  groupId?: string;
  database?: string;
  schema?: string;
}

export interface ConnectionGroup {
  id: string;
  name: string;
  color?: string;
}

export interface MCPHandshake {
  port: number;
  token: string;
  pid: number;
  protocolVersion: string;
  tls: boolean;
  tlsCertFingerprint?: string;
}

export interface DatabaseInfo {
  name: string;
}

export interface SchemaInfo {
  name: string;
  database?: string;
}

export interface TableInfo {
  name: string;
  schema?: string;
  database?: string;
  rowCount?: number;
  type?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
  defaultValue?: string | null;
  comment?: string | null;
}

export interface QueryResult {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  affectedRows?: number;
  durationMs?: number;
  error?: string;
  isTruncated?: boolean;
  statusMessage?: string;
}

export interface RecentTab {
  id: string;
  connectionId: string;
  connectionName: string;
  tabType: "query" | "table" | "structure";
  title: string;
  tableName?: string;
  databaseName?: string;
  schemaName?: string;
  updatedAt?: string;
}

export interface QueryHistoryEntry {
  id: string;
  connectionId?: string;
  connectionName?: string;
  query: string;
  executedAt: string;
  durationMs?: number;
  rowCount?: number;
}

export interface ConnectionStatus {
  status: "connected" | "connecting" | "disconnected" | "error";
  currentDatabase?: string;
  currentSchema?: string;
  serverVersion?: string;
  connectedAt?: string;
  lastActiveAt?: string;
  errorMessage?: string;
}

export interface ProgressEvent {
  progress: number;
  total?: number;
  message?: string;
}

export class TableProNotInstalledError extends Error {
  constructor() {
    super("TablePro is not installed");
    this.name = "TableProNotInstalledError";
  }
}

export class MCPNotRunningError extends Error {
  constructor() {
    super("TablePro MCP server is not running");
    this.name = "MCPNotRunningError";
  }
}

export class TokenMissingError extends Error {
  constructor() {
    super("No API token. Run the Pair with TablePro command first.");
    this.name = "TokenMissingError";
  }
}

export class TokenRevokedError extends Error {
  constructor() {
    super("API token was revoked. Pair with TablePro again.");
    this.name = "TokenRevokedError";
  }
}

export class MCPSessionExpiredError extends Error {
  constructor(message = "Session not found") {
    super(message);
    this.name = "MCPSessionExpiredError";
  }
}

export class ExternalAccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalAccessDeniedError";
  }
}

export class RemoteAccessUnsupportedError extends Error {
  constructor() {
    super(
      "Remote MCP not yet supported in Raycast. Disable remote access in TablePro Settings.",
    );
    this.name = "RemoteAccessUnsupportedError";
  }
}
