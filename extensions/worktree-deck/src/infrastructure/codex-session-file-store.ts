import { createReadStream, existsSync, promises as fs } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";

import { LocalStorage } from "@raycast/api";

import {
  sessionLogParserService,
  type ParsedSessionLog,
  type ReviewParentDedupeEntry,
  type SessionParseState,
  type SessionStatus as ParserSessionStatus,
} from "../domain/session-log-parser.service";
import { expandHomePath, normalizePathValue } from "../domain/path-utils";
import { loadEnvValue } from "./env/env-store";
import type { SessionKind, SessionMessage, SessionMessageRole, Worktree, WorktreeTitle } from "./worktree-types";
import {
  loadExplicitSessionTitlesForWorktreePaths,
  type ExplicitSessionTitleLookup,
} from "./worktree-session-title-store";

type SessionStatus = ParserSessionStatus;

type SessionTitleEntry = WorktreeTitle &
  ReviewParentDedupeEntry & {
    isWaitingForUser: boolean;
    sessionThreadId: string | null;
  };

type TitlesTimingLogger = (label: string, elapsedMs: number) => void;

type TitlesCacheFileEntry = {
  mtimeMs: number;
  size: number;
  skillScanOffset: number;
  updatedAt: number;
  startedAt: number | null;
  title: string | null;
  latestMessage: string | null;
  status: SessionStatus | null;
  cwds: string[];
  sessionKind: SessionKind;
  skillUsages: ParsedSessionLog["skillUsages"];
  reviewTurnIds: string[];
  titleTurnId: string | null;
  isWaitingForUser: boolean;
  sessionThreadId: string | null;
  parentThreadId: string | null;
};

type TitlesCacheStorage = {
  searchDays: number;
  cachedAt: number;
  files: Record<string, TitlesCacheFileEntry>;
};

const DEFAULT_SEARCH_DAYS = 90;
const ENV_CODEX_HOME = "CODEX_HOME";
const ENV_SEARCH_DAYS = "WORKTREE_DECK_SEARCH_DAYS";
/**
 * タイトルキャッシュのキー接頭辞
 */
const TITLES_CACHE_KEY_PREFIX = "worktree-deck.titles-cache.v15";
/**
 * working を done に切り替える経過日数の環境変数名
 */
const ENV_DONE_THRESHOLD_DAYS = "WORKTREE_DECK_DONE_THRESHOLD_DAYS";
const SESSIONS_DIR_NAME = "sessions";
const SESSION_FILE_EXTENSIONS = [".jsonl", ".json"] as const;
/**
 * session file 未検出の明示タイトルを working 扱いにする日数
 */
const EXPLICIT_ONLY_WORKING_DAYS = 1;
/**
 * セッション計測ログを常に出力するか
 */
const FORCE_SESSION_TIMING_LOG = false;
/**
 * 先頭読み込みの最大バイト数
 */
const SESSION_HEAD_READ_BYTES = 256 * 1024;
/**
 * 末尾読み込みの最大バイト数
 */
const SESSION_TAIL_READ_BYTES = 256 * 1024;
/**
 * 末尾再解析で改行位置を探す最大逆走バイト数
 */
const SESSION_TAIL_REALIGN_LOOKBACK_BYTES = 2 * 1024 * 1024;
/**
 * 末尾再解析で改行位置を探す1回あたりの読み込みサイズ
 */
const SESSION_TAIL_REALIGN_CHUNK_BYTES = 64 * 1024;

function hasSessionFileExtension(name: string): boolean {
  return SESSION_FILE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * 検索日数を読み取り不正なら既定値にする
 */
async function loadSearchDays(args: {
  env: NodeJS.ProcessEnv;
  cwd: string;
  homeDir: string | null;
  assetsPath: string;
  packageDir: string;
  packageName: string;
}): Promise<number> {
  const raw = await loadEnvValue(args, ENV_SEARCH_DAYS);
  if (!raw) {
    return DEFAULT_SEARCH_DAYS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_SEARCH_DAYS;
  }
  return parsed;
}

/**
 * working を done 扱いにする経過日数を取得する
 */
async function loadDoneThresholdDays(args: {
  env: NodeJS.ProcessEnv;
  cwd: string;
  homeDir: string | null;
  assetsPath: string;
  packageDir: string;
  packageName: string;
}): Promise<number | null> {
  const raw = await loadEnvValue(args, ENV_DONE_THRESHOLD_DAYS);
  if (!raw) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

/**
 * CODEX_HOME を取得しホーム展開・正規化する
 */
async function loadCodexHome(args: {
  env: NodeJS.ProcessEnv;
  cwd: string;
  homeDir: string | null;
  assetsPath: string;
  packageDir: string;
  packageName: string;
}): Promise<string | null> {
  const value = await loadEnvValue(args, ENV_CODEX_HOME);
  if (!value) {
    return null;
  }
  const expanded = expandHomePath(value.trim(), args.homeDir);
  return normalizePathValue(expanded);
}

/**
 * 日付フォルダを走査してセッションファイルを集める
 */
async function collectSessionFiles(
  codexHome: string,
  searchDays: number,
): Promise<{ path: string; updatedAt: number; size: number }[]> {
  const startMs = Date.now();
  const sessionRoot = join(codexHome, SESSIONS_DIR_NAME);
  if (!existsSync(sessionRoot)) {
    return [];
  }
  const results: { path: string; updatedAt: number; size: number }[] = [];
  const today = new Date();

  for (let offset = 0; offset < searchDays; offset += 1) {
    const current = new Date(today);
    current.setDate(today.getDate() - offset);
    const year = current.getFullYear().toString();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    const dir = join(sessionRoot, year, month, day);
    if (!existsSync(dir)) {
      continue;
    }
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    const files = entries
      .filter((entry) => entry.isFile() && hasSessionFileExtension(entry.name))
      .map((entry) => join(dir, entry.name));
    for (const filePath of files) {
      try {
        const stat = await fs.stat(filePath);
        results.push({ path: filePath, updatedAt: stat.mtimeMs, size: stat.size });
      } catch {
        continue;
      }
    }
  }

  const sorted = results.sort((left, right) => {
    if (right.updatedAt !== left.updatedAt) {
      return right.updatedAt - left.updatedAt;
    }
    return right.path.localeCompare(left.path);
  });
  logSessionTiming("collectSessionFiles", Date.now() - startMs);
  return sorted;
}

type SessionTailParseResult = {
  start: number;
  droppedPartialFirstLine: boolean;
  lineAlignedStart: number;
};

/**
 * 計測ログを有効にするか判定する
 */
function shouldLogTiming(): boolean {
  return FORCE_SESSION_TIMING_LOG;
}

/**
 * セッション関連の計測ログを出力する
 */
function logSessionTiming(label: string, elapsedMs: number): void {
  if (!shouldLogTiming()) {
    return;
  }
  const msText = Number.isFinite(elapsedMs) ? elapsedMs.toFixed(1) : "0.0";
  console.info(`[worktree-deck][session] ${label}: ${msText}ms`);
}

/**
 * タイトル読み込み内の任意 step を計測する
 */
async function measureTitleStep<TValue>(args: {
  label: string;
  logTiming?: TitlesTimingLogger;
  task: () => Promise<TValue>;
}): Promise<TValue> {
  const startMs = Date.now();
  try {
    return await args.task();
  } finally {
    args.logTiming?.(args.label, Date.now() - startMs);
  }
}

/**
 * タイトル読み込み内の同期 step を計測する
 */
function measureTitleSyncStep<TValue>(args: {
  label: string;
  logTiming?: TitlesTimingLogger;
  task: () => TValue;
}): TValue {
  const startMs = Date.now();
  try {
    return args.task();
  } finally {
    args.logTiming?.(args.label, Date.now() - startMs);
  }
}

/**
 * タイトル cache 保存をタイトル反映後の後続処理として予約する
 */
function scheduleTitlesCacheStorageSave(args: {
  label: string;
  logTiming?: TitlesTimingLogger;
  cacheKey: string;
  storage: TitlesCacheStorage;
}): void {
  setTimeout(() => {
    void measureTitleStep({
      label: args.label,
      logTiming: args.logTiming,
      task: () => saveTitlesCacheStorage(args.cacheKey, args.storage),
    });
  }, 0);
}

/**
 * セッションファイル短縮読み込みで全量フォールバックが必要か判定する
 */
function shouldRunSessionFullParseFallback(args: {
  needsTitle: boolean;
  needsLatest: boolean;
  needsCwds: boolean;
  latestStatus: SessionStatus | null;
  tailTruncated: boolean;
  tailReparsed: boolean;
}): boolean {
  const { needsTitle, needsLatest, needsCwds, latestStatus, tailTruncated, tailReparsed } = args;
  if (needsTitle || needsLatest || needsCwds) {
    return true;
  }
  return latestStatus != null && tailTruncated && !tailReparsed;
}

/**
 * 前回のスキル履歴走査位置を継続利用できるか判定する
 */
function resolveSkillScanOffset(cachedEntry: TitlesCacheFileEntry | undefined, fileSize: number): number | null {
  if (!cachedEntry) {
    return null;
  }
  if (!Number.isFinite(cachedEntry.skillScanOffset)) {
    return null;
  }
  if (cachedEntry.skillScanOffset < 0 || cachedEntry.skillScanOffset > fileSize) {
    return null;
  }
  return cachedEntry.skillScanOffset;
}

/**
 * 改行文字のバイト値か判定する
 */
function isLineBreakByte(byte: number): boolean {
  return byte === 0x0a || byte === 0x0d;
}

/**
 * 末尾読み込み開始位置が行境界か判定する
 */
async function isTailStartAtLineBoundary(handle: FileHandle, start: number): Promise<boolean> {
  if (start <= 0) {
    return true;
  }
  const prevByteBuffer = Buffer.alloc(1);
  const { bytesRead } = await handle.read(prevByteBuffer, 0, 1, start - 1);
  if (bytesRead !== 1) {
    return false;
  }
  return isLineBreakByte(prevByteBuffer[0] ?? -1);
}

/**
 * 末尾読み込み開始位置の直前改行まで逆走して開始位置を補正する
 */
async function findLineAlignedTailStart(handle: FileHandle, start: number): Promise<number> {
  if (start <= 0) {
    return 0;
  }
  const lookbackStart = Math.max(0, start - SESSION_TAIL_REALIGN_LOOKBACK_BYTES);
  let cursor = start;
  while (cursor > lookbackStart) {
    const chunkStart = Math.max(lookbackStart, cursor - SESSION_TAIL_REALIGN_CHUNK_BYTES);
    const length = cursor - chunkStart;
    const chunk = Buffer.alloc(length);
    const { bytesRead } = await handle.read(chunk, 0, length, chunkStart);
    if (bytesRead <= 0) {
      break;
    }
    for (let index = bytesRead - 1; index >= 0; index -= 1) {
      if (chunk[index] === 0x0a) {
        return chunkStart + index + 1;
      }
    }
    cursor = chunkStart;
  }
  if (lookbackStart === 0) {
    return 0;
  }
  return start;
}

/**
 * セッションログをストリーミング解析して必要情報を抽出する
 */
/**
 * セッションファイルを全行解析する
 */
async function parseSessionFileFull(filePath: string, homeDir: string | null, state: SessionParseState): Promise<void> {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const reader = createInterface({ input: stream, crlfDelay: Infinity });

  try {
    for await (const line of reader) {
      sessionLogParserService.updateParseState({ line, homeDir, state, skipFirstUserMessage: false });
    }
  } finally {
    reader.close();
    stream.destroy();
  }
}

/**
 * セッションファイル先頭を制限付きで解析する
 */
async function parseSessionFileHead(
  filePath: string,
  homeDir: string | null,
  state: SessionParseState,
  limitBytes: number,
): Promise<void> {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const reader = createInterface({ input: stream, crlfDelay: Infinity });
  let consumed = 0;

  try {
    for await (const line of reader) {
      sessionLogParserService.updateParseState({ line, homeDir, state, skipFirstUserMessage: false });
      consumed += Buffer.byteLength(line, "utf8") + 1;
      if (consumed >= limitBytes) {
        break;
      }
    }
  } finally {
    reader.close();
    stream.destroy();
  }
}

/**
 * セッションファイル末尾を制限付きで解析する
 */
async function parseSessionFileTail(
  filePath: string,
  homeDir: string | null,
  state: SessionParseState,
  limitBytes: number,
  startOverride?: number,
): Promise<SessionTailParseResult | null> {
  let fileStat;
  try {
    fileStat = await fs.stat(filePath);
  } catch {
    return null;
  }
  const size = fileStat.size;
  if (size === 0) {
    return null;
  }
  const baseStart = startOverride ?? Math.max(0, size - limitBytes);
  const start = Math.max(0, Math.min(baseStart, size));
  let handle;
  let droppedPartialFirstLine = false;
  let lineAlignedStart = start;
  try {
    handle = await fs.open(filePath, "r");
    const length = size - start;
    if (length <= 0) {
      return { start, droppedPartialFirstLine, lineAlignedStart };
    }
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, start);
    const text = buffer.toString("utf8");
    const lines = text.split(/\r?\n/);
    if (start > 0) {
      const startsAtBoundary = await isTailStartAtLineBoundary(handle, start);
      if (startsAtBoundary) {
        if (lines[0] === "") {
          lines.shift();
        }
      } else {
        droppedPartialFirstLine = true;
        lines.shift();
        lineAlignedStart = await findLineAlignedTailStart(handle, start);
      }
    }
    for (const line of lines) {
      sessionLogParserService.updateParseState({ line, homeDir, state, skipFirstUserMessage: true });
    }
    return { start, droppedPartialFirstLine, lineAlignedStart };
  } finally {
    if (handle) {
      await handle.close();
    }
  }
}

/**
 * セッションログを短縮解析して必要情報を抽出する
 */
async function parseSessionFile(filePath: string, homeDir: string | null): Promise<ParsedSessionLog> {
  const startMs = Date.now();
  let state = sessionLogParserService.createParseState();

  let fileStat;
  try {
    fileStat = await fs.stat(filePath);
  } catch {
    fileStat = null;
  }

  const fileSize = fileStat?.size ?? 0;
  if (fileSize > 0 && fileSize <= SESSION_HEAD_READ_BYTES) {
    await parseSessionFileFull(filePath, homeDir, state);
  } else {
    await parseSessionFileHead(filePath, homeDir, state, SESSION_HEAD_READ_BYTES);
    const tailParseResult = await parseSessionFileTail(filePath, homeDir, state, SESSION_TAIL_READ_BYTES);
    let tailReparsed = false;
    if (
      state.latestStatus === "working" &&
      tailParseResult?.droppedPartialFirstLine &&
      tailParseResult.lineAlignedStart < tailParseResult.start
    ) {
      await parseSessionFileTail(filePath, homeDir, state, SESSION_TAIL_READ_BYTES, tailParseResult.lineAlignedStart);
      tailReparsed = true;
    }
    const needsTitle = !state.firstEventUserMessage && !state.goalObjectiveMessage;
    const needsLatest = state.latestStatus == null && !state.latestEventMessage;
    const needsCwds = state.cwds.size === 0;
    const shouldFallback = shouldRunSessionFullParseFallback({
      needsTitle,
      needsLatest,
      needsCwds,
      latestStatus: state.latestStatus,
      tailTruncated: tailParseResult?.droppedPartialFirstLine ?? false,
      tailReparsed,
    });
    if (shouldFallback && fileSize > 0) {
      const fallbackState = sessionLogParserService.createParseState();
      await parseSessionFileFull(filePath, homeDir, fallbackState);
      state = fallbackState;
    }
  }

  const parsed = sessionLogParserService.finalizeParseState(state);
  logSessionTiming("parseSessionFile", Date.now() - startMs);
  return parsed;
}

/**
 * セッションファイルの指定位置以降からスキル使用履歴だけを走査する
 */
async function scanSessionSkillUsages(args: {
  filePath: string;
  startOffset: number;
  fileSize: number;
}): Promise<{ skillUsages: ParsedSessionLog["skillUsages"]; scannedOffset: number }> {
  if (args.startOffset >= args.fileSize) {
    return { skillUsages: [], scannedOffset: args.fileSize };
  }
  let handle;
  const skillUsages: ParsedSessionLog["skillUsages"] = [];
  try {
    handle = await fs.open(args.filePath, "r");
    const length = args.fileSize - args.startOffset;
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, args.startOffset);
    const text = buffer.toString("utf8");
    const hasCompleteFinalLine = text.endsWith("\n") || text.endsWith("\r");
    const lines = text.split(/\r?\n/);
    if (!hasCompleteFinalLine) {
      lines.pop();
    }
    for (const line of lines) {
      skillUsages.push(...sessionLogParserService.extractSkillUsagesFromLogLine(line));
    }
    const lastLineBreakIndex = Math.max(buffer.lastIndexOf(0x0a), buffer.lastIndexOf(0x0d));
    const scannedBytes = lastLineBreakIndex >= 0 ? lastLineBreakIndex + 1 : 0;
    const scannedOffset = hasCompleteFinalLine ? args.fileSize : args.startOffset + scannedBytes;
    return {
      skillUsages,
      scannedOffset,
    };
  } finally {
    if (handle) {
      await handle.close();
    }
  }
}

/**
 * cache と今回解析分を使ってスキル使用履歴を単調に更新する
 */
async function resolveSessionSkillUsageCache(args: {
  filePath: string;
  fileSize: number;
  cachedEntry: TitlesCacheFileEntry | undefined;
  parsedSkillUsages: ParsedSessionLog["skillUsages"];
}): Promise<{ skillUsages: ParsedSessionLog["skillUsages"]; skillScanOffset: number }> {
  const cachedOffset = resolveSkillScanOffset(args.cachedEntry, args.fileSize);
  if (cachedOffset != null) {
    const scanned = await scanSessionSkillUsages({
      filePath: args.filePath,
      startOffset: cachedOffset,
      fileSize: args.fileSize,
    });
    return {
      skillUsages: sessionLogParserService.mergeSessionSkillUsages(
        args.cachedEntry?.skillUsages ?? [],
        args.parsedSkillUsages,
        scanned.skillUsages,
      ),
      skillScanOffset: scanned.scannedOffset,
    };
  }
  if (args.fileSize <= SESSION_HEAD_READ_BYTES) {
    return {
      skillUsages: args.parsedSkillUsages,
      skillScanOffset: args.fileSize,
    };
  }
  const scanned = await scanSessionSkillUsages({
    filePath: args.filePath,
    startOffset: 0,
    fileSize: args.fileSize,
  });
  return {
    skillUsages: sessionLogParserService.mergeSessionSkillUsages(args.parsedSkillUsages, scanned.skillUsages),
    skillScanOffset: scanned.scannedOffset,
  };
}

/**
 * タイトルキャッシュ用のキーを生成する
 */
function buildTitlesCacheKey(codexHome: string): string {
  const encoded = Buffer.from(codexHome).toString("base64");
  return `${TITLES_CACHE_KEY_PREFIX}:${encoded}`;
}

/**
 * タイトルキャッシュの保存値を正規化する
 */
function normalizeTitlesCacheStorage(value: unknown): TitlesCacheStorage | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const searchDays = typeof raw.searchDays === "number" ? raw.searchDays : null;
  const cachedAt = typeof raw.cachedAt === "number" ? raw.cachedAt : null;
  const filesRaw = raw.files;
  if (searchDays == null || cachedAt == null || !filesRaw || typeof filesRaw !== "object") {
    return null;
  }
  const files: Record<string, TitlesCacheFileEntry> = {};
  for (const [filePath, entry] of Object.entries(filesRaw as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const rawEntry = entry as Record<string, unknown>;
    const mtimeMs = typeof rawEntry.mtimeMs === "number" ? rawEntry.mtimeMs : null;
    const size = typeof rawEntry.size === "number" ? rawEntry.size : null;
    const skillScanOffset = typeof rawEntry.skillScanOffset === "number" ? rawEntry.skillScanOffset : null;
    const updatedAt = typeof rawEntry.updatedAt === "number" ? rawEntry.updatedAt : null;
    const startedAt = typeof rawEntry.startedAt === "number" ? rawEntry.startedAt : null;
    const title = typeof rawEntry.title === "string" ? rawEntry.title : null;
    const latestMessage = typeof rawEntry.latestMessage === "string" ? rawEntry.latestMessage : null;
    const status = rawEntry.status === "working" || rawEntry.status === "done" ? rawEntry.status : null;
    const sessionKind = normalizeSessionKind(rawEntry.sessionKind);
    const skillUsages = normalizeSessionSkillUsages(rawEntry.skillUsages);
    const isWaitingForUser = typeof rawEntry.isWaitingForUser === "boolean" ? rawEntry.isWaitingForUser : false;
    const sessionThreadId = typeof rawEntry.sessionThreadId === "string" ? rawEntry.sessionThreadId : null;
    const parentThreadId = typeof rawEntry.parentThreadId === "string" ? rawEntry.parentThreadId : null;
    const reviewTurnIds = Array.isArray(rawEntry.reviewTurnIds)
      ? rawEntry.reviewTurnIds.filter((item): item is string => typeof item === "string")
      : [];
    const titleTurnId = typeof rawEntry.titleTurnId === "string" ? rawEntry.titleTurnId : null;
    const cwdsRaw = rawEntry.cwds;
    if (mtimeMs == null || size == null || updatedAt == null || sessionKind == null || !Array.isArray(cwdsRaw)) {
      continue;
    }
    const cwds = cwdsRaw.filter((item) => typeof item === "string") as string[];
    files[filePath] = {
      mtimeMs,
      size,
      skillScanOffset: skillScanOffset ?? 0,
      updatedAt,
      startedAt,
      title,
      latestMessage,
      status,
      cwds,
      sessionKind,
      skillUsages,
      reviewTurnIds,
      titleTurnId,
      isWaitingForUser,
      sessionThreadId,
      parentThreadId,
    };
  }
  return { searchDays, cachedAt, files };
}

/**
 * キャッシュ由来のスキル使用履歴を正規化する
 */
function normalizeSessionSkillUsages(value: unknown): ParsedSessionLog["skillUsages"] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const raw = item as Record<string, unknown>;
    if (typeof raw.name !== "string" || !raw.name.trim()) {
      return [];
    }
    return [
      {
        name: raw.name.trim(),
        timestamp: typeof raw.timestamp === "string" ? raw.timestamp : null,
      },
    ];
  });
}

/**
 * キャッシュ由来の sessionKind を正規化する
 */
function normalizeSessionKind(value: unknown): SessionKind | null {
  return sessionLogParserService.isSessionKind(value) ? value : null;
}

/**
 * タイトルキャッシュを読み込む
 */
async function loadTitlesCacheStorage(key: string): Promise<TitlesCacheStorage | null> {
  try {
    const raw = await LocalStorage.getItem<string>(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    return normalizeTitlesCacheStorage(parsed);
  } catch {
    return null;
  }
}

/**
 * タイトルキャッシュを保存する
 */
async function saveTitlesCacheStorage(key: string, value: TitlesCacheStorage): Promise<void> {
  try {
    await LocalStorage.setItem(key, JSON.stringify(value));
  } catch {
    // キャッシュ保存失敗は一覧取得を止めない
  }
}

/**
 * timestamp 文字列を表示用のミリ秒へ変換する
 */
function parseExplicitTitleTimestamp(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

/**
 * session file に未対応の明示タイトルの状態を解決する
 */
function resolveExplicitOnlyStatus(args: {
  updatedAt: number;
  nowMs: number;
  doneThresholdMs: number | null;
}): SessionStatus {
  const thresholdMs = args.doneThresholdMs ?? EXPLICIT_ONLY_WORKING_DAYS * 24 * 60 * 60 * 1000;
  return args.updatedAt <= args.nowMs - thresholdMs ? "done" : "working";
}

/**
 * 明示タイトルだけから一覧表示用タイトルを組み立てる
 */
function buildExplicitOnlyTitles(args: {
  paths: string[];
  explicitTitles: ExplicitSessionTitleLookup;
  nowMs: number;
  doneThresholdMs: number | null;
}): Map<string, WorktreeTitle[]> {
  const titles = new Map<string, WorktreeTitle[]>();
  for (const path of args.paths) {
    const entries = args.explicitTitles.byWorktreePath.get(path) ?? [];
    if (entries.length === 0) {
      continue;
    }
    titles.set(
      path,
      entries
        .map((entry) => {
          const updatedAt = parseExplicitTitleTimestamp(entry.updatedAt) ?? args.nowMs;
          return {
            title: entry.title,
            status: resolveExplicitOnlyStatus({ updatedAt, nowMs: args.nowMs, doneThresholdMs: args.doneThresholdMs }),
            latestMessage: null,
            updatedAt,
            startedAt: parseExplicitTitleTimestamp(entry.createdAt),
            sessionKind: "main" as const,
            isWaitingForUser: false,
            skillUsages: [],
          };
        })
        .sort((left, right) => {
          if (right.updatedAt !== left.updatedAt) {
            return right.updatedAt - left.updatedAt;
          }
          return right.title.localeCompare(left.title);
        }),
    );
  }
  return titles;
}

/**
 * セッションログからパス別タイトルを収集する
 */
export async function loadTitlesForPaths(args: {
  paths: string[];
  env: NodeJS.ProcessEnv;
  cwd: string;
  homeDir: string | null;
  assetsPath: string;
  packageDir: string;
  packageName: string;
  timingLabelPrefix?: string;
  logTiming?: TitlesTimingLogger;
}): Promise<Map<string, WorktreeTitle[]>> {
  const startMs = Date.now();
  if (args.paths.length === 0) {
    return new Map();
  }
  const nowMs = Date.now();
  const timingLabelPrefix = args.timingLabelPrefix ?? "loadTitlesForPaths";
  const [explicitTitles, doneThresholdDays, codexHome, searchDays] = await Promise.all([
    measureTitleStep({
      label: `${timingLabelPrefix}:loadExplicitSessionTitlesForWorktreePaths(paths=${args.paths.length})`,
      logTiming: args.logTiming,
      task: () => loadExplicitSessionTitlesForWorktreePaths(args),
    }),
    measureTitleStep({
      label: `${timingLabelPrefix}:loadDoneThresholdDays`,
      logTiming: args.logTiming,
      task: () => loadDoneThresholdDays(args),
    }),
    measureTitleStep({
      label: `${timingLabelPrefix}:loadCodexHome`,
      logTiming: args.logTiming,
      task: () => loadCodexHome(args),
    }),
    measureTitleStep({
      label: `${timingLabelPrefix}:loadSearchDays`,
      logTiming: args.logTiming,
      task: () => loadSearchDays(args),
    }),
  ]);
  const doneThresholdMs = doneThresholdDays != null ? doneThresholdDays * 24 * 60 * 60 * 1000 : null;
  if (!codexHome) {
    return measureTitleSyncStep({
      label: `${timingLabelPrefix}:buildExplicitOnlyTitles(paths=${args.paths.length})`,
      logTiming: args.logTiming,
      task: () => buildExplicitOnlyTitles({ paths: args.paths, explicitTitles, nowMs, doneThresholdMs }),
    });
  }

  const cacheKey = buildTitlesCacheKey(codexHome);
  const cachedStorage = await measureTitleStep({
    label: `${timingLabelPrefix}:loadTitlesCacheStorage`,
    logTiming: args.logTiming,
    task: () => loadTitlesCacheStorage(cacheKey),
  });
  const canUseCache = cachedStorage != null && cachedStorage.searchDays >= searchDays;
  const cachedFiles = canUseCache ? cachedStorage.files : {};

  const collectSessionFilesStartMs = Date.now();
  const sessionFiles = await collectSessionFiles(codexHome, searchDays);
  args.logTiming?.(
    `${timingLabelPrefix}:collectSessionFiles(days=${searchDays},files=${sessionFiles.length})`,
    Date.now() - collectSessionFilesStartMs,
  );
  if (sessionFiles.length === 0) {
    return measureTitleSyncStep({
      label: `${timingLabelPrefix}:buildExplicitOnlyTitles(paths=${args.paths.length})`,
      logTiming: args.logTiming,
      task: () => buildExplicitOnlyTitles({ paths: args.paths, explicitTitles, nowMs, doneThresholdMs }),
    });
  }

  const pathEntries = sessionLogParserService.buildPathEntries(args.paths);
  const titleEntries = new Map<string, Map<string, SessionTitleEntry>>();
  const matchedExplicitThreadIds = new Set<string>();
  const waitingForUserThreadIds = new Set<string>();
  const parentThreadIdByThreadId = new Map<string, string>();
  const nextCacheFiles: Record<string, TitlesCacheFileEntry> = {};
  const processSessionFilesStartMs = Date.now();
  let cacheHitCount = 0;
  let cacheMissCount = 0;
  let parseSessionFilesElapsedMs = 0;

  for (const sessionFile of sessionFiles) {
    try {
      const cachedEntry = cachedFiles[sessionFile.path];
      const isCachedSame =
        cachedEntry != null && cachedEntry.mtimeMs === sessionFile.updatedAt && cachedEntry.size === sessionFile.size;
      let entry: TitlesCacheFileEntry | null = null;
      if (isCachedSame) {
        cacheHitCount += 1;
        entry = cachedEntry;
      } else {
        cacheMissCount += 1;
        const parseSessionFileStartMs = Date.now();
        const parsed = await parseSessionFile(sessionFile.path, args.homeDir);
        const skillUsageCache = await resolveSessionSkillUsageCache({
          filePath: sessionFile.path,
          fileSize: sessionFile.size,
          cachedEntry,
          parsedSkillUsages: parsed.skillUsages,
        });
        parseSessionFilesElapsedMs += Date.now() - parseSessionFileStartMs;
        entry = {
          mtimeMs: sessionFile.updatedAt,
          size: sessionFile.size,
          skillScanOffset: skillUsageCache.skillScanOffset,
          updatedAt: sessionFile.updatedAt,
          startedAt: parsed.startedAt,
          title: parsed.title,
          titleTurnId: parsed.titleTurnId,
          latestMessage: parsed.latestMessage,
          status: parsed.status,
          cwds: parsed.cwds,
          sessionKind: parsed.sessionKind,
          reviewTurnIds: parsed.reviewTurnIds,
          isWaitingForUser: parsed.isWaitingForUser,
          sessionThreadId: parsed.sessionThreadId,
          parentThreadId: parsed.parentThreadId,
          skillUsages: skillUsageCache.skillUsages,
        };
      }

      if (!entry) {
        continue;
      }
      nextCacheFiles[sessionFile.path] = entry;

      if (entry.sessionThreadId && entry.parentThreadId) {
        parentThreadIdByThreadId.set(entry.sessionThreadId, entry.parentThreadId);
      }
      if (entry.isWaitingForUser) {
        if (entry.sessionThreadId) {
          waitingForUserThreadIds.add(entry.sessionThreadId);
        }
        if (entry.parentThreadId) {
          waitingForUserThreadIds.add(entry.parentThreadId);
        }
      }

      if (!sessionLogParserService.isTitleSessionKind(entry.sessionKind)) {
        continue;
      }
      const explicitTitle = entry.sessionThreadId ? explicitTitles.byThreadId.get(entry.sessionThreadId) : null;
      const resolvedTitle = explicitTitle?.title ?? entry.title;
      if (!resolvedTitle || entry.cwds.length === 0) {
        continue;
      }
      for (const cwd of entry.cwds) {
        const matched = sessionLogParserService.matchPath(cwd, pathEntries);
        if (!matched) {
          continue;
        }
        let resolvedStatus = entry.status;
        if (entry.status === "working" && doneThresholdMs != null) {
          const cutoffMs = nowMs - doneThresholdMs;
          if (entry.updatedAt <= cutoffMs) {
            resolvedStatus = "done";
          }
        }
        if (explicitTitle) {
          matchedExplicitThreadIds.add(explicitTitle.threadId);
        }
        const existing = titleEntries.get(matched);
        const titleEntry = {
          title: resolvedTitle,
          status: resolvedStatus,
          latestMessage: entry.latestMessage,
          updatedAt: entry.updatedAt,
          startedAt: entry.startedAt,
          sessionPath: sessionFile.path,
          titleTurnId: entry.titleTurnId,
          sessionKind: entry.sessionKind,
          reviewTurnIds: entry.reviewTurnIds,
          isWaitingForUser: entry.isWaitingForUser,
          sessionThreadId: entry.sessionThreadId,
          skillUsages: entry.skillUsages,
        };
        const titleKey = `${entry.sessionThreadId ?? resolvedTitle}::${sessionFile.path}`;
        if (existing) {
          const current = existing.get(titleKey);
          if (!current || current.updatedAt < titleEntry.updatedAt) {
            existing.set(titleKey, titleEntry);
          }
        } else {
          titleEntries.set(matched, new Map([[titleKey, titleEntry]]));
        }
      }
    } catch {
      continue;
    }
  }
  args.logTiming?.(`${timingLabelPrefix}:parseSessionFiles(cacheMisses=${cacheMissCount})`, parseSessionFilesElapsedMs);
  args.logTiming?.(
    `${timingLabelPrefix}:processSessionFiles(files=${sessionFiles.length},cacheHits=${cacheHitCount},cacheMisses=${cacheMissCount})`,
    Date.now() - processSessionFilesStartMs,
  );

  const titles = measureTitleSyncStep({
    label: `${timingLabelPrefix}:finalizeTitles(paths=${args.paths.length})`,
    logTiming: args.logTiming,
    task: () => {
      for (const path of args.paths) {
        const entries = explicitTitles.byWorktreePath.get(path) ?? [];
        for (const explicitTitle of entries) {
          if (matchedExplicitThreadIds.has(explicitTitle.threadId)) {
            continue;
          }
          const updatedAt = parseExplicitTitleTimestamp(explicitTitle.updatedAt);
          const startedAt = parseExplicitTitleTimestamp(explicitTitle.createdAt);
          const titleEntry: SessionTitleEntry = {
            title: explicitTitle.title,
            status: resolveExplicitOnlyStatus({ updatedAt: updatedAt ?? nowMs, nowMs, doneThresholdMs }),
            latestMessage: null,
            updatedAt: updatedAt ?? nowMs,
            startedAt,
            sessionKind: "main",
            isWaitingForUser: false,
            sessionThreadId: explicitTitle.threadId,
            titleTurnId: null,
            reviewTurnIds: [],
            sessionPath: undefined,
            skillUsages: [],
          };
          const existing = titleEntries.get(path);
          const titleKey = `${explicitTitle.threadId}::explicit`;
          if (existing) {
            existing.set(titleKey, titleEntry);
          } else {
            titleEntries.set(path, new Map([[titleKey, titleEntry]]));
          }
        }
      }

      const expandedWaitingForUserThreadIds = sessionLogParserService.expandWaitingForUserThreadIds({
        waitingThreadIds: waitingForUserThreadIds,
        parentThreadIdByThreadId,
      });
      const nextTitles = new Map<string, WorktreeTitle[]>();
      for (const [path, entries] of titleEntries) {
        const dedupedEntries = sessionLogParserService.dedupeReviewParentEntries(Array.from(entries.values()));
        nextTitles.set(
          path,
          dedupedEntries
            .sort((left, right) => {
              if (right.updatedAt !== left.updatedAt) {
                return right.updatedAt - left.updatedAt;
              }
              return right.title.localeCompare(left.title);
            })
            .map((entry) => ({
              title: entry.title,
              status: entry.status,
              latestMessage: entry.latestMessage,
              updatedAt: entry.updatedAt,
              startedAt: entry.startedAt,
              sessionPath: entry.sessionPath,
              sessionKind: entry.sessionKind,
              isWaitingForUser:
                entry.isWaitingForUser ||
                (entry.sessionThreadId ? expandedWaitingForUserThreadIds.has(entry.sessionThreadId) : false),
              skillUsages: entry.skillUsages,
            })),
        );
      }
      return nextTitles;
    },
  });
  if (!canUseCache || cacheMissCount > 0) {
    scheduleTitlesCacheStorageSave({
      label: `${timingLabelPrefix}:saveTitlesCacheStorage(files=${Object.keys(nextCacheFiles).length})`,
      logTiming: args.logTiming,
      cacheKey,
      storage: {
        searchDays,
        cachedAt: nowMs,
        files: nextCacheFiles,
      },
    });
  }
  logSessionTiming("loadTitlesForPaths", Date.now() - startMs);
  return titles;
}

/**
 * セッションファイルから最終回答を取得する
 */
export async function loadLatestSessionAnswer(args: {
  filePath: string;
  homeDir: string | null;
}): Promise<string | null> {
  try {
    const stream = createReadStream(args.filePath, { encoding: "utf8" });
    const reader = createInterface({ input: stream, crlfDelay: Infinity });
    let latestMessage: string | null = null;
    try {
      for await (const line of reader) {
        const message = sessionLogParserService.extractAssistantMessageFromLogLine(line);
        if (message != null) {
          latestMessage = message;
        }
      }
    } finally {
      reader.close();
      stream.destroy();
    }
    return latestMessage;
  } catch {
    return null;
  }
}

/**
 * セッションファイルから最新の user/assistant メッセージを取得する
 */
export async function loadLatestSessionMessages(args: {
  filePath: string;
  homeDir: string | null;
}): Promise<SessionMessage[]> {
  try {
    const stream = createReadStream(args.filePath, { encoding: "utf8" });
    const reader = createInterface({ input: stream, crlfDelay: Infinity });
    const latestByRole = new Map<SessionMessageRole, { order: number; message: SessionMessage }>();
    let pendingAssistants: { order: number; message: SessionMessage }[] = [];
    /**
     * 保留中のassistantメッセージを反映する
     */
    const flushPendingAssistant = () => {
      if (pendingAssistants.length === 0) {
        return;
      }
      for (const pending of pendingAssistants) {
        latestByRole.set("assistant", pending);
      }
      pendingAssistants = [];
    };
    let lineIndex = 0;
    try {
      for await (const line of reader) {
        lineIndex += 1;
        if (!line) {
          continue;
        }
        const shouldParseJson = line.includes('"event_msg"') || line.includes('"response_item"');
        if (!shouldParseJson) {
          continue;
        }
        try {
          const parsed = JSON.parse(line) as Record<string, unknown>;
          const timestamp = sessionLogParserService.extractLogTimestamp(parsed);
          const responseItemType = sessionLogParserService.extractResponseItemType(parsed);
          if (responseItemType && sessionLogParserService.isWorkingResponseItemType(responseItemType)) {
            pendingAssistants = [];
            continue;
          }
          const responseMessage = sessionLogParserService.extractResponseMessage(parsed);
          if (responseMessage && sessionLogParserService.isSessionMessageRole(responseMessage.role)) {
            if (!responseMessage.text.trim()) {
              continue;
            }
            const message = { role: responseMessage.role, text: responseMessage.text, timestamp } as const;
            if (responseMessage.role === "assistant" && responseMessage.phase !== "final_answer") {
              pendingAssistants.push({ order: lineIndex, message });
            } else {
              flushPendingAssistant();
              latestByRole.set(responseMessage.role, { order: lineIndex, message });
            }
            continue;
          }
          const eventMessage = sessionLogParserService.extractSessionMessageFromEvent(parsed);
          if (eventMessage) {
            if (!eventMessage.text.trim()) {
              continue;
            }
            const message = { role: eventMessage.role, text: eventMessage.text, timestamp } as const;
            if (eventMessage.role === "assistant") {
              pendingAssistants.push({ order: lineIndex, message });
            } else {
              flushPendingAssistant();
              latestByRole.set(eventMessage.role, { order: lineIndex, message });
            }
          }
        } catch {
          continue;
        }
      }
    } finally {
      reader.close();
      stream.destroy();
    }
    flushPendingAssistant();
    return Array.from(latestByRole.values())
      .sort((left, right) => left.order - right.order)
      .map((entry) => entry.message);
  } catch {
    return [];
  }
}

/**
 * セッションファイルからuser/assistantメッセージを古い順で取得する
 */
export async function loadSessionMessages(args: {
  filePath: string;
  homeDir: string | null;
}): Promise<SessionMessage[]> {
  try {
    const stream = createReadStream(args.filePath, { encoding: "utf8" });
    const reader = createInterface({ input: stream, crlfDelay: Infinity });
    const messages: { message: SessionMessage; source: "event" | "response" }[] = [];
    let pendingAssistants: { message: SessionMessage; source: "event" | "response" }[] = [];
    let pendingUsers: { message: SessionMessage; source: "event" | "response" }[] = [];
    let skippedFirstUserMessage = false;
    let firstUserMessageText: string | null = null;
    let shouldIgnoreFirstUserMessageText = false;
    let hasAssistantAfterFirstUser = false;
    /**
     * 直近メッセージと重複する場合は統合する
     */
    const pushMessage = (
      entry: { role: SessionMessageRole; text: string; timestamp: string | null },
      source: "event" | "response",
    ) => {
      if (!entry.text.trim()) {
        return;
      }
      const last = messages[messages.length - 1];
      if (last && last.message.role === entry.role && last.message.text === entry.text && last.source !== source) {
        const hasTimestamp = entry.timestamp != null;
        const lastHasTimestamp = last.message.timestamp != null;
        const shouldReplace =
          (source === "response" && (hasTimestamp || !lastHasTimestamp)) || (!lastHasTimestamp && hasTimestamp);
        if (shouldReplace) {
          messages[messages.length - 1] = { message: { ...entry }, source };
        }
        return;
      }
      messages.push({ message: { ...entry }, source });
    };
    /**
     * 保留中のassistantメッセージを出力へ反映する
     */
    const flushPendingAssistant = () => {
      if (pendingAssistants.length === 0) {
        return;
      }
      for (const pending of pendingAssistants) {
        pushMessage(
          {
            role: pending.message.role,
            text: pending.message.text,
            timestamp: pending.message.timestamp,
          },
          pending.source,
        );
      }
      pendingAssistants = [];
    };
    /**
     * 保留中のuserメッセージを出力へ反映する
     */
    const flushPendingUser = () => {
      if (pendingUsers.length === 0) {
        return;
      }
      for (const pendingUser of pendingUsers) {
        pushMessage(
          {
            role: pendingUser.message.role,
            text: pendingUser.message.text,
            timestamp: pendingUser.message.timestamp,
          },
          pendingUser.source,
        );
      }
      pendingUsers = [];
    };
    /**
     * assistantメッセージを後続イベント判定のため保留する
     */
    const holdAssistantMessage = (
      entry: { role: SessionMessageRole; text: string; timestamp: string | null },
      source: "event" | "response",
    ) => {
      pendingAssistants.push({ message: { ...entry }, source });
    };
    /**
     * userメッセージを後続イベント判定のため保留する
     */
    const holdUserMessage = (
      entry: { role: SessionMessageRole; text: string; timestamp: string | null },
      source: "event" | "response",
    ) => {
      pendingUsers.push({ message: { ...entry }, source });
    };
    /**
     * 中断マーカー検知時に保留中のuserメッセージを破棄する
     */
    const dropPendingUser = () => {
      pendingUsers = [];
    };
    /**
     * ユーザーメッセージの除外判定を行う
     */
    const shouldSkipUserMessage = (text: string): boolean => {
      if (!text.trim()) {
        return true;
      }
      if (!skippedFirstUserMessage) {
        skippedFirstUserMessage = true;
        firstUserMessageText = text;
        shouldIgnoreFirstUserMessageText = true;
        return true;
      }
      if (
        sessionLogParserService.containsInstructionMarker(text) ||
        sessionLogParserService.containsEnvironmentContext(text) ||
        sessionLogParserService.containsImageTag(text)
      ) {
        return true;
      }
      if (sessionLogParserService.containsTurnAborted(text)) {
        dropPendingUser();
        return true;
      }
      if (!hasAssistantAfterFirstUser && shouldIgnoreFirstUserMessageText && firstUserMessageText === text) {
        return true;
      }
      return false;
    };
    try {
      for await (const line of reader) {
        if (!line) {
          continue;
        }
        const shouldParseJson = line.includes('"event_msg"') || line.includes('"response_item"');
        if (!shouldParseJson) {
          continue;
        }
        try {
          const parsed = JSON.parse(line) as Record<string, unknown>;
          const timestamp = sessionLogParserService.extractLogTimestamp(parsed);
          const responseItemType = sessionLogParserService.extractResponseItemType(parsed);
          if (responseItemType && sessionLogParserService.isWorkingResponseItemType(responseItemType)) {
            pendingAssistants = [];
            continue;
          }
          const responseMessage = sessionLogParserService.extractResponseMessage(parsed);
          if (responseMessage && sessionLogParserService.isSessionMessageRole(responseMessage.role)) {
            if (responseMessage.role === "user" && shouldSkipUserMessage(responseMessage.text)) {
              continue;
            }
            if (responseMessage.role === "user") {
              flushPendingAssistant();
              holdUserMessage({ role: responseMessage.role, text: responseMessage.text, timestamp }, "response");
              continue;
            }
            flushPendingUser();
            if (responseMessage.role === "assistant" && responseMessage.phase !== "final_answer") {
              holdAssistantMessage({ role: responseMessage.role, text: responseMessage.text, timestamp }, "response");
              hasAssistantAfterFirstUser = true;
              shouldIgnoreFirstUserMessageText = false;
            } else {
              if (responseMessage.role === "assistant") {
                flushPendingAssistant();
              }
              pushMessage({ role: responseMessage.role, text: responseMessage.text, timestamp }, "response");
              if (responseMessage.role === "assistant") {
                hasAssistantAfterFirstUser = true;
                shouldIgnoreFirstUserMessageText = false;
              }
            }
            continue;
          }
          const eventMessage = sessionLogParserService.extractSessionMessageFromEvent(parsed);
          if (eventMessage) {
            if (eventMessage.role === "user" && shouldSkipUserMessage(eventMessage.text)) {
              continue;
            }
            if (eventMessage.role === "user") {
              flushPendingAssistant();
              holdUserMessage({ role: eventMessage.role, text: eventMessage.text, timestamp }, "event");
              continue;
            }
            flushPendingUser();
            if (eventMessage.role === "assistant") {
              holdAssistantMessage({ role: eventMessage.role, text: eventMessage.text, timestamp }, "event");
              hasAssistantAfterFirstUser = true;
              shouldIgnoreFirstUserMessageText = false;
            } else {
              pushMessage({ role: eventMessage.role, text: eventMessage.text, timestamp }, "event");
            }
          }
        } catch {
          continue;
        }
      }
    } finally {
      reader.close();
      stream.destroy();
    }
    flushPendingUser();
    flushPendingAssistant();
    return messages.map((entry) => entry.message);
  } catch {
    return [];
  }
}

/**
 * 指定パスに紐づく最新のセッションファイルを取得する
 */
export async function findLatestSessionFileByPath(args: {
  path: string;
  env: NodeJS.ProcessEnv;
  cwd: string;
  homeDir: string | null;
  assetsPath: string;
  packageDir: string;
  packageName: string;
}): Promise<string | null> {
  const startMs = Date.now();
  const trimmedPath = args.path.trim();
  if (!trimmedPath) {
    return null;
  }

  const codexHome = await loadCodexHome(args);
  if (!codexHome) {
    return null;
  }

  const searchDays = await loadSearchDays(args);
  const sessionFiles = await collectSessionFiles(codexHome, searchDays);
  if (sessionFiles.length === 0) {
    return null;
  }

  const pathEntries = sessionLogParserService.buildPathEntries([trimmedPath]);
  for (const sessionFile of sessionFiles) {
    try {
      const { cwds, sessionKind } = await parseSessionFile(sessionFile.path, args.homeDir);
      if (!sessionLogParserService.isTitleSessionKind(sessionKind)) {
        continue;
      }
      if (cwds.some((cwd) => sessionLogParserService.matchPath(cwd, pathEntries))) {
        logSessionTiming("findLatestSessionFileByPath", Date.now() - startMs);
        return sessionFile.path;
      }
    } catch {
      continue;
    }
  }

  logSessionTiming("findLatestSessionFileByPath", Date.now() - startMs);
  return null;
}

/**
 * 指定パスに紐づく最初のセッションファイルを取得する
 */
export async function findFirstSessionFileByPath(args: {
  path: string;
  env: NodeJS.ProcessEnv;
  cwd: string;
  homeDir: string | null;
  assetsPath: string;
  packageDir: string;
  packageName: string;
}): Promise<string | null> {
  const startMs = Date.now();
  const trimmedPath = args.path.trim();
  if (!trimmedPath) {
    return null;
  }

  const codexHome = await loadCodexHome(args);
  if (!codexHome) {
    return null;
  }

  const searchDays = await loadSearchDays(args);
  const sessionFiles = await collectSessionFiles(codexHome, searchDays);
  if (sessionFiles.length === 0) {
    return null;
  }

  const pathEntries = sessionLogParserService.buildPathEntries([trimmedPath]);
  let firstSession: { path: string; startedAt: number; updatedAt: number } | null = null;
  for (const sessionFile of sessionFiles) {
    try {
      const { cwds, sessionKind, startedAt } = await parseSessionFile(sessionFile.path, args.homeDir);
      if (!sessionLogParserService.isMainSessionKind(sessionKind)) {
        continue;
      }
      if (!cwds.some((cwd) => sessionLogParserService.matchPath(cwd, pathEntries))) {
        continue;
      }
      const resolvedStartedAt = startedAt ?? sessionFile.updatedAt;
      const candidate = { path: sessionFile.path, startedAt: resolvedStartedAt, updatedAt: sessionFile.updatedAt };
      if (
        firstSession == null ||
        candidate.startedAt < firstSession.startedAt ||
        (candidate.startedAt === firstSession.startedAt && candidate.updatedAt < firstSession.updatedAt)
      ) {
        firstSession = candidate;
      }
    } catch {
      continue;
    }
  }

  logSessionTiming("findFirstSessionFileByPath", Date.now() - startMs);
  return firstSession?.path ?? null;
}

/**
 * worktree のパス一覧からタイトルを取得する
 */
async function loadWorktreeTitles(args: {
  worktrees: Worktree[];
  env: NodeJS.ProcessEnv;
  cwd: string;
  homeDir: string | null;
  assetsPath: string;
  packageDir: string;
  packageName: string;
}): Promise<Map<string, WorktreeTitle[]>> {
  return loadTitlesForPaths({
    paths: args.worktrees.map((item) => item.path),
    env: args.env,
    cwd: args.cwd,
    homeDir: args.homeDir,
    assetsPath: args.assetsPath,
    packageDir: args.packageDir,
    packageName: args.packageName,
  });
}

/**
 * worktree にタイトル情報を付与する
 */
export async function attachWorktreeTitles(args: {
  worktrees: Worktree[];
  env: NodeJS.ProcessEnv;
  cwd: string;
  homeDir: string | null;
  assetsPath: string;
  packageDir: string;
  packageName: string;
  titlesByPath?: Map<string, WorktreeTitle[]>;
}): Promise<Worktree[]> {
  try {
    const titles = args.titlesByPath ?? (await loadWorktreeTitles(args));
    if (titles.size === 0) {
      return args.worktrees;
    }
    return args.worktrees.map((item) => {
      const itemTitleEntries = titles.get(item.path);
      if (!itemTitleEntries || itemTitleEntries.length === 0) {
        return item;
      }
      return { ...item, titleEntries: itemTitleEntries };
    });
  } catch {
    return args.worktrees;
  }
}
