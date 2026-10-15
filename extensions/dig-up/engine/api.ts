// The daemon's HTTP API over a Unix socket (/tmp/digup-<uid>-<hash>/d.sock; see DaemonInfo). Shared by
// engine/daemon.ts and src/lib/client.ts. JSON bodies; errors are HTTP 4xx/5xx with {error: string}.

import type { FileKind, FileState, Hit } from "./types";

export const API_VERSION = 1;

/** Settings the daemon owns (<supportPath>/config.json). Paths are absolute, symlink-resolved. */
export interface Config {
  /** Folders searched whole ("chosen"). */
  folders: string[];
  /** Folders left out of any chosen folder that contains them. */
  skipped: string[];
  /** Folders whose code is indexed into the code index ("code:" searches). */
  codeFolders: string[];
  codeSkipped: string[];
  /** Lowercase extensions without the dot. */
  excludedExtensions: string[];
  /** Index the first full pass while on battery power (DigUp default: on). */
  indexOnBattery: boolean;
  /** Index only inside these hours (local time, 0-23, start inclusive, end exclusive); null = any time. */
  indexHours: { start: number; end: number } | null;
  /** Pause everything until resumed. */
  paused: boolean;
  /** Seconds of quiet before the code index catches up (DigUp default 60). */
  codeQuietSeconds: number;
  /** Optional overrides; null = find automatically. */
  llamaServerPath: string | null;
  modelFolder: string | null;
}

export type SetupState =
  | { state: "ready" }
  | { state: "missing"; missing: ("model-text" | "model-media" | "llama")[] }
  | {
      state: "downloading";
      what: string;
      bytes: number;
      total: number;
      /** Measured over the last seconds of the download; absent until there is a measure. */
      bytesPerSecond?: number;
      /** Set while a network problem is waited out: DigUp's "Waiting for the network…" (the download resumes by itself). */
      waiting?: string;
    }
  | { state: "verifying"; what: string }
  | { state: "failed"; error: string };

export interface KindCounts {
  files: number;
  done: number;
  partial: number;
  pending: number;
  skipped: number;
  failed: number;
}

export interface IndexCounts {
  byKind: Partial<Record<FileKind, KindCounts>>;
  total: KindCounts;
  vectors: number;
  segments: number;
  /** Long files with pages/chunks still to read, and how many. */
  unfinished: { files: number; units: number };
}

export interface Status {
  apiVersion: number;
  pid: number;
  setup: SetupState;
  /** What the daemon is doing now. */
  activity:
    /** The engine opens its index (DigUp's EngineStatus.Activity.starting). */
    | { state: "starting" }
    /** The engine stopped and can't go on by itself ("Can't open the index", "Indexing stopped"). */
    | { state: "failed"; problem: string }
    | { state: "idle" }
    | { state: "syncing"; index: "main" | "code" }
    | {
        state: "indexing";
        index: "main" | "code";
        pass: "new" | "first" | "rest";
        done: number;
        total: number;
        current: { path: string; kind: FileKind } | null;
        /** Seconds left in this pass, from measured costs; null when unknown. */
        secondsLeft: number | null;
      };
  /** Why indexing is held, or null. "paused" = by the user. */
  held: null | "paused" | "on battery" | "Low Power Mode" | "Mac is warm" | "outside index hours" | "setup";
  main: IndexCounts;
  code: IndexCounts | null;
  /** Meaning search is ready (query encoder loaded). */
  encoder: "off" | "starting" | "ready" | "failed";
  lastError: { at: number; message: string; path?: string } | null;
  folders: string[];
  codeFolders: string[];
  /** Outside the index hours: when indexing may run again (ms since 1970); null or absent otherwise. */
  heldUntil?: number | null;
  /** Chosen folders that aren't there right now (an unplugged drive): skipped, and their files kept. */
  missingFolders?: string[];
  /** Chosen folders macOS doesn't let Dig Up read: skipped, and their files kept. */
  unreadableFolders?: string[];
  codeMissingFolders?: string[];
  codeUnreadableFolders?: string[];
  /** When this engine started (ms since 1970): a `lastError` from before it isn't current. */
  startedAt?: number;
  /** What's indexed under each chosen folder, and under each code folder (ui-contract C2). */
  folderSummaries?: FolderSummary[];
  codeFolderSummaries?: FolderSummary[];
}

export interface SearchRequest {
  query: string;
  /** Restrict to these kinds; null/absent = all. Ignored for code queries. */
  kinds?: FileKind[] | null;
  limit?: number;
  /** false = keyword results only (the instant first phase). Default true. */
  meaning?: boolean;
  /** Treat the last word as a prefix (while typing). Default false. */
  prefixLast?: boolean;
}

export interface SearchResponse {
  hits: Hit[];
  /** Number of leading hits that are strong (DigUp's 0.5× fold). */
  strong: number;
  /** True when this was a "code:" search of the code index. */
  code: boolean;
  /** Whether meaning (vectors) took part; false = words only. */
  meaning: boolean;
  /** Why meaning was off, if it was: "warming" (encoder starting), "unavailable", "code-off" (no code folders),
   *  "code-hint" ("code:" with nothing after it). */
  note: null | "warming" | "unavailable" | "code-off" | "code-hint";
  /** The query's words as the searcher sees them (for highlighting). */
  terms: string[];
  ms: { embed: number; search: number };
}

export interface FolderEstimate {
  folder: string;
  files: number;
  byKind: Partial<Record<FileKind, number>>;
  skipped: Record<string, number>;
  /** First-pass seconds, and the later pass for long files. */
  seconds: number;
  laterSeconds: number;
  /** Code index only: estimated bytes on disk. */
  bytes?: number;
  /** False when the folder isn't there or macOS doesn't let Dig Up read it. */
  readable?: boolean;
  /** The estimate couldn't be made (the walk failed). */
  failed?: boolean;
  /** One level down, the subfolders with something to index, biggest first (at most 500; no deeper `subfolders`). */
  subfolders?: FolderEstimate[];
  /** Pages the first pass reads; long files whose rest comes later; seconds of recordings. */
  pdfPages?: number;
  longFiles?: number;
  audioSeconds?: number;
  videoSeconds?: number;
}

/** What's indexed under one chosen folder (DigUp: Engine.RootSummary). */
export interface FolderSummary {
  folder: string;
  /** Not there right now (an unplugged drive), or not readable (macOS privacy settings). */
  missing: boolean;
  unreadable: boolean;
  files: number;
  /** Searchable: done, or partly read (long files). */
  indexed: number;
  pending: number;
  failed: number;
  skipped: number;
  /** Long files searchable but still being read (counted in `indexed` too). */
  unfinished: number;
  byKind: Partial<Record<FileKind, number>>;
}

export interface EstimateRequest {
  folders: string[];
  code?: boolean;
}

export interface ThumbRequest {
  path: string;
  kind: FileKind;
  /** PDF page (1-based) or seconds. */
  loc?: number | null;
  /** Audio: the end second of the matched stretch, lit on the waveform. */
  locEnd?: number | null;
  /** Words to highlight on a PDF page. */
  words?: string[];
  maxPixel?: number;
}

export interface ThumbResponse {
  path: string;
  width: number;
  height: number;
}

export interface FileListRequest {
  states?: FileState[];
  kinds?: FileKind[];
  code?: boolean;
  limit?: number;
}

export interface FileListItem {
  path: string;
  kind: FileKind;
  state: FileState;
  detail: string | null;
}

/** Open a PDF with words in its app's search (DigUp's keyAESearchText Apple event), at page > 1. */
export interface OpenPdfRequest {
  path: string;
  page: number;
  /** Matched words from the excerpt, then the query terms; the helper picks the landmark word for the page. */
  words: string[];
}

/** Open a recording or video at a moment: QuickTime (osascript) or IINA (URL); anything else opens plainly. */
export interface OpenMediaRequest {
  path: string;
  seconds: number;
  /** Bundle id of the app to use; null = the file's default app. */
  player: string | null;
}

export interface OpenResponse {
  /** How it was opened: "search" (PDF search words), "moment", or "plain" (fallback, e.g. automation denied). */
  how: "search" | "moment" | "plain";
}

/** Where the daemon listens. macOS caps a Unix socket path at 104 bytes, so the socket lives in a short folder
 *  (/tmp/digup-<uid>-<hash of supportPath>/d.sock) and this file in supportPath records it. */
export interface DaemonInfo {
  pid: number;
  socket: string;
  apiVersion: number;
  startedAt: number;
}
export const DAEMON_INFO_FILE = "daemon.json";

/** Route table: method + path → request/response. */
export interface Routes {
  "GET /status": { req: void; res: Status };
  "POST /search": { req: SearchRequest; res: SearchResponse };
  "POST /prewarm": { req: Record<string, never>; res: { encoder: Status["encoder"] } };
  "POST /sync": { req: Record<string, never>; res: Record<string, never> };
  "POST /pause": { req: { paused: boolean }; res: Status };
  "GET /config": { req: void; res: Config };
  "POST /config": { req: Partial<Config>; res: Config };
  "POST /estimate": { req: EstimateRequest; res: FolderEstimate[] };
  "POST /setup": { req: Record<string, never>; res: Status };
  "POST /reindex": { req: { code?: boolean }; res: Record<string, never> };
  "POST /thumb": { req: ThumbRequest; res: ThumbResponse };
  "POST /files": { req: FileListRequest; res: FileListItem[] };
  "POST /suggest-code-folders": { req: Record<string, never>; res: string[] };
  /** A segment's full text (code stretches and passages for the preview pane): DigUp Searcher.text(ofSegment:). */
  "POST /segment-text": { req: { segmentId: number; code: boolean }; res: { text: string | null } };
  "POST /open-pdf": { req: OpenPdfRequest; res: OpenResponse };
  "POST /open-media": { req: OpenMediaRequest; res: OpenResponse };
  "POST /access": { req: { folders: string[] }; res: { folder: string; readable: boolean; error?: string }[] };
  "POST /quit": { req: Record<string, never>; res: Record<string, never> };
}
