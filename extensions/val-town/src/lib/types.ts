export type Privacy = "public" | "private" | "unlisted";

export type ValSummary = {
  id: string;
  name: string;
  identifier: string;
  description: string | null;
  privacy: Privacy;
  httpPrivacy: "public" | "restricted";
  createdAt: string;
  author: { id: string; username: string };
  links: { self: string; html: string };
};

export type ListValsResponse = {
  user: { id: string; handle: string };
  count: number;
  hasMore: boolean;
  vals: ValSummary[];
};

export type Branch = {
  name: string;
  version: number;
  updatedAt: string;
};

export type ValDetailResponse = {
  identifier: string;
  name: string;
  description: string | null;
  privacy: Privacy;
  httpPrivacy: "public" | "restricted";
  createdAt: string;
  author: { username: string; type: string };
  htmlUrl: string;
  branches: { count: number; items: Branch[] };
};

export type FileType = "file" | "directory" | "http" | "script" | "interval" | "email";

export type ValFile = {
  id: string;
  name: string;
  path: string;
  type: FileType;
  version: number;
  updatedAt: string;
  /** Never build this URL by hand: it encodes the file id, not the val name. */
  endpoint?: string;
  links?: { endpoint?: string };
};

export type ListFilesResponse = {
  val: string;
  branch: string;
  path: string;
  count: number;
  files: ValFile[];
};

export type ReadFileResponse = {
  content: string;
  fileType: FileType;
};

type TraceEntry = {
  traceId: string;
  name: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  status: "ok" | "error" | string;
  error?: string;
  httpMethod?: string;
  httpUrl?: string;
  httpStatus?: number;
  valType?: string;
};

export type TracesResponse = {
  fileId: string;
  fileName: string;
  timeWindow: { start: string; end: string };
  count: number;
  truncated: boolean;
  traces: TraceEntry[];
};

type LogEntry = {
  timestamp: string;
  level: string;
  body: string;
  traceId?: string;
};

export type LogsResponse = {
  fileId: string;
  timeWindow: { start: string; end: string };
  count: number;
  truncated: boolean;
  next_end?: string;
  logs: LogEntry[];
};

export type IntervalSettings = {
  type?: "delay" | "cron" | string;
  delay?: number;
  unit?: string;
  cron?: string;
};

export type HistoryCommit = {
  id: string;
  version: number;
  createdAt: string;
  user?: { handle?: string };
  file?: { fileId: string; name: string; fileType: string };
  multiple?: { count: number; commits: { id: string; file?: { name: string; fileType: string } }[] };
  merge?: { name: string; version: number } | null;
  revert?: unknown;
};

export type HistoryResponse = {
  val: string;
  branch: string;
  branchVersion: number;
  pagination: { offset: number; limit: number; hasNext: boolean; returned: number };
  history: HistoryCommit[];
};

export type SqliteResponse = {
  columns?: string[];
  columnTypes?: string[];
  rows?: Record<string, unknown>[] | unknown[][];
  rowsAffected?: number;
};

type BlobSummary = {
  key: string;
  size?: number;
  lastModified?: string;
};

export type ListBlobsResponse = {
  count: number;
  blobs: BlobSummary[];
};

export type ReadBlobResponse = {
  key?: string;
  content?: string;
  size?: number;
  contentType?: string;
  truncated?: boolean;
};

export type RunFileResponse = {
  type?: string;
  evaluationId?: string;
  message?: string;
  stack?: string;
  code?: string;
  value?: unknown;
  logs?: { log: string; level: string }[];
};

type Org = {
  id: string;
  handle: string;
  displayName: string | null;
  tier: string;
  role: string;
  isPersonal: boolean;
};

export type ListOrgsResponse = {
  user: { id: string; handle: string };
  orgs: Org[];
};

type Skill = {
  name: string;
  description: string;
  content: string;
  source: "official" | "personal" | string;
};

export type FindSkillsResponse = {
  query: string;
  matches: Skill[];
};
