/** ME protocol v1 as implemented by helper/host.py of this build. */
export type Kind = "bookmark" | "collection" | "tag";
export type Heads = Record<string, string[]>;
export type Position = { parent: string | null; order: number };
export type Life = "active" | "trashed" | "purged";
export type Value =
  | string
  | number
  | boolean
  | null
  | Position
  | Record<string, unknown>;
export interface Edit {
  entity: string;
  kind?: Kind;
  base?: Heads;
  values: Record<string, Value>;
  resolve?: boolean;
  /** D1 page metadata write; conflicts on these fields are overwritten, not created. */
  metadata?: boolean;
  /** Fields the user explicitly accepted from the reviewed page. */
  autoFields?: string[];
  /** Explicit acceptance of page metadata; requires the reviewed url and versions. */
  acceptedMetadata?: boolean;
  url?: string;
  auto?: boolean;
}
export interface Command {
  id: string;
  libraryId?: string;
  edits: Edit[];
}
export interface Candidate {
  entity: string;
  kind: Kind;
  field: string;
  value: Value;
  parents: string[];
  version: string;
  actor: string;
  actorName?: string;
  time: number;
}
export interface Entity {
  id: string;
  kind: Kind;
  values: Record<string, Value>;
  heads: Heads;
  policies: Record<string, "auto" | "manual">;
  conflicts: Record<string, Candidate[]>;
  purged: boolean;
  structural: {
    field: string;
    reason: "cycle" | "deleted-parent" | "deleted-tag" | "missing-reference";
    target?: string;
  }[];
}
export interface Query {
  kind?: Kind;
  q?: string;
  collection?: string | null;
  descendants?: boolean;
  tag?: string;
  tags?: string[];
  favorite?: boolean;
  type?: string;
  trash?: boolean;
  conflicts?: boolean;
  sort?: "title" | "url" | "manual";
  offset?: number;
  limit?: number;
}
export interface Methods {
  rebuildSearchIndex: Record<string, never>;
  capabilities: {};
  query: Query;
  get: { id: string };
  execute: Command;
  commandStatus: { id: string };
  status: {};
  openManager: { id?: string; conflicts?: boolean; launch?: boolean };
  managerStatus: { requestId: string };
  managerOpened: { requestId: string };
  configureManager: { browser: "chrome" | "edge" | "arc"; profile?: string | null };
  create: { path: string; name?: string };
  bind: { path: string };
  chooseDirectory: {};
  configureSync: { url: string; user: string; password: string };
  sync: { publish?: boolean; force?: boolean };
  join: {
    path: string;
    url: string;
    user: string;
    password: string;
    libraryId: string;
  };
  importPreview: { source: string; content?: string; nodes?: unknown[] };
  export: { skip?: boolean };
}
export type Request<K extends keyof Methods = keyof Methods> = {
  v: 1;
  id?: string;
  libraryId?: string;
  method: K;
  params?: Methods[K];
};
export type ErrorCode =
  | "SEARCH_INDEX"
  | "AUTH"
  | "BASE_REQUIRED"
  | "BUSY"
  | "CONFLICT"
  | "CORRUPT"
  | "CREDENTIAL"
  | "CYCLE"
  | "EXISTS"
  | "EXPORT_CONFLICT"
  | "ID_COLLISION"
  | "IMPORT_FORMAT"
  | "INVALID"
  | "IO"
  | "LIBRARY_MISMATCH"
  | "MANAGER_UNBOUND"
  | "MANAGER_UNAVAILABLE"
  | "METHOD"
  | "MISSING_DEPENDENCY"
  | "NETWORK"
  | "NOT_BOUND"
  | "NOT_EMPTY"
  | "NOT_FOUND"
  | "NO_LIBRARY"
  | "PATH"
  | "PERMISSION"
  | "PURGED"
  | "RATE_LIMIT"
  | "REMOTE"
  | "REMOTE_GAP"
  | "REMOTE_LIMIT"
  | "STALE_RESOLUTION"
  | "TOO_LARGE"
  | "UNSUPPORTED"
  | "VERSION";
export type Response<T = unknown> =
  | { v: 1; id?: string; ok: true; result: T }
  | {
      v: 1;
      id?: string;
      ok: false;
      error: { code: ErrorCode; message: string };
    };
export interface QueryResult {
  items: (Entity & { tags: string[]; candidateMatch: boolean })[];
  total: number;
  revision: string;
}
export interface CommandResult {
  state: "committed-readable" | "no-change";
  revision: string;
  commandId?: string;
  writtenHeads?: Record<string, Heads>;
}
export interface CommandStatus {
  state: "not-found" | "committed-recovering" | "committed-readable";
  revision: string;
}
export interface LibraryInfo {
  libraryId: string;
  name?: string;
  schema: number;
}
export interface Capabilities {
  protocol: 1;
  schema: 1;
  version: string;
  features: string[];
  binding: string | null;
  manager: ManagerTarget | null;
  library: LibraryInfo | null;
  commands: (keyof Methods)[];
}
/**
 * The manager is the extension page (index.html) at HashRouter routes:
 *   /my/0                      library root
 *   /my/0/item/<displayId>     one bookmark, displayId = first 52 bits of the
 *                              SHA-256 of the entity UUID, plus one
 * `conflicts: true` adds ?conflicts=1 and opens the existing conflict list.
 */
export interface ManagerResult {
  path: "index.html";
  fragment: string;
  libraryId: string;
  target?: ManagerTarget;
  requestId?: string;
  opened?: boolean;
  created?: number;
  acknowledged?: number;
}
export interface ManagerTarget {
  browser: "chrome" | "edge" | "arc";
  profile: string | null;
  extensionId: string;
}
export interface ManagerStatus {
  requestId: string;
  libraryId: string;
  fragment: string;
  opened: boolean;
  created: number;
  acknowledged?: number;
}
