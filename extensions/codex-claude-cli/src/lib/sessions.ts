import { createReadStream, promises as fs, readdirSync } from "node:fs";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { createInterface } from "node:readline";
import { promisify } from "node:util";

import { compactText, projectName } from "./format";
import { ChatMessage, ChatProvider, ChatSession, DataRoots, Transcript } from "./types";

const CLAUDE_SESSION_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/i;
const CODEX_SESSION_ID_PATTERN = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i;
const SESSION_ID_GLOBAL_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const HEAD_BYTES = 192 * 1_024;
const FULL_TRANSCRIPT_BYTES = 4 * 1_024 * 1_024;
const TAIL_TRANSCRIPT_BYTES = 3 * 1_024 * 1_024;
const INCREMENTAL_BYTES = 2 * 1_024 * 1_024;
const MAX_TRANSCRIPT_MESSAGES = 400;
const MAX_TRANSCRIPT_CHARACTERS = 2_000_000;
const MAX_MESSAGE_CHARACTERS = 160_000;
const MAX_JSON_LINE_CHARACTERS = 2_000_000;
const MAX_TRAILING_LINE_CHARACTERS = 256_000;
const MAX_TRANSCRIPT_CACHE_ENTRIES = 2;
const MAX_HISTORY_PROMPT_CHARACTERS = 2_000;

interface HistoryEntry {
  firstPrompt: string;
  lastPrompt: string;
  firstTimestamp: number;
  lastTimestamp: number;
  project: string;
  count: number;
}

interface SessionHead {
  title?: string;
  cwd?: string;
  timestamp?: number;
  model?: string;
  cliVersion?: string;
  firstPrompt?: string;
  isInternalSubagent?: boolean;
}

interface TranscriptCacheEntry extends Transcript {
  modifiedAt: number;
  trailingLine: string;
}

interface CodexDatabaseEntry {
  id: string;
  title: string;
  preview: string;
  firstPrompt: string;
  cwd: string;
  createdAt: number;
  updatedAt: number;
  cliVersion?: string;
  model?: string;
  isInternalSubagent: boolean;
}

interface CodexDatabaseCache {
  signature: string;
  entries: Map<string, CodexDatabaseEntry>;
}

interface LiveProcessSessions {
  claude: Set<string>;
  codex: Set<string>;
}

interface ProcessEntry {
  processId: number;
  tty: string;
  command: string;
}

const sessionHeadCache = new Map<string, SessionHead>();
const transcriptCache = new Map<string, TranscriptCacheEntry>();
const executeFile = promisify(execFile);
let codexDatabaseCache: CodexDatabaseCache | undefined;
let liveProcessSessionsCache: { expiresAt: number; value: LiveProcessSessions } | undefined;
let liveProcessSessionsPromise: Promise<LiveProcessSessions> | undefined;

export function resolveDataRoots(preferences: Preferences): DataRoots {
  return {
    claude: expandHome(preferences.claudeHome?.trim() || process.env.CLAUDE_CONFIG_DIR || "~/.claude"),
    codex: expandHome(preferences.codexHome?.trim() || process.env.CODEX_HOME || "~/.codex"),
  };
}

export async function listChatSessions(roots: DataRoots): Promise<ChatSession[]> {
  const [claudeSessions, codexSessions] = await Promise.all([
    listClaudeSessions(roots.claude),
    listCodexSessions(roots.codex),
  ]);

  return [...claudeSessions, ...codexSessions].sort((first, second) => second.updatedAt - first.updatedAt);
}

export async function loadTranscript(session: ChatSession): Promise<Transcript> {
  const fileStats = await fs.stat(session.sourcePath);
  const cached = transcriptCache.get(session.sourcePath);

  if (cached && cached.fileSize === fileStats.size && cached.modifiedAt === fileStats.mtimeMs) {
    cacheTranscript(session.sourcePath, cached);
    return cached;
  }

  if (cached && fileStats.size > cached.fileSize && fileStats.size - cached.fileSize <= INCREMENTAL_BYTES) {
    const appendedText = await readRange(session.sourcePath, cached.fileSize, fileStats.size - cached.fileSize);
    const parsed = parseTranscriptText(session.provider, `${cached.trailingLine}${appendedText}`, true);
    const bounded = limitTranscriptMessages([...cached.messages, ...parsed.messages]);
    const updated: TranscriptCacheEntry = {
      messages: bounded.messages,
      truncated: cached.truncated || bounded.truncated || fileStats.size > FULL_TRANSCRIPT_BYTES,
      parsedBytes: cached.parsedBytes + Buffer.byteLength(appendedText),
      fileSize: fileStats.size,
      modifiedAt: fileStats.mtimeMs,
      trailingLine: limitTrailingLine(parsed.trailingLine),
    };
    cacheTranscript(session.sourcePath, updated);
    return updated;
  }

  const initial = await readTranscriptText(session.sourcePath, fileStats.size);
  const parsed = parseTranscriptSegments(session.provider, initial.segments, initial.keepTrailingLine);
  const bounded = limitTranscriptMessages(parsed.messages);
  const transcript: TranscriptCacheEntry = {
    messages: bounded.messages,
    truncated: initial.truncated || bounded.truncated,
    parsedBytes: initial.parsedBytes,
    fileSize: fileStats.size,
    modifiedAt: fileStats.mtimeMs,
    trailingLine: limitTrailingLine(parsed.trailingLine),
  };
  cacheTranscript(session.sourcePath, transcript);
  return transcript;
}

export async function isChatSessionCurrentlyActive(session: ChatSession): Promise<boolean> {
  try {
    const [registeredProcessIds, processEntries] = await Promise.all([
      loadRegisteredProcessIds(session),
      loadProcessEntries(),
    ]);
    const entriesByProcessId = new Map(processEntries.map((entry) => [entry.processId, entry]));

    for (const processId of registeredProcessIds) {
      const processEntry = entriesByProcessId.get(processId);
      if (processEntry && processCommandMatchesProvider(processEntry.command, session.provider)) return true;
    }

    const candidates = processEntries.filter(
      (entry) => entry.tty !== "??" && processCommandMatchesProvider(entry.command, session.provider),
    );
    if (candidates.some((entry) => entry.command.toLowerCase().includes(session.id.toLowerCase()))) return true;

    const openFileMatches = await mapWithConcurrency(candidates, 4, (entry) =>
      processHasSessionFile(entry.processId, session),
    );
    return openFileMatches.some(Boolean);
  } catch {
    return session.isActive;
  }
}

export function sessionWatchPaths(roots: DataRoots): string[] {
  const codexDatabase = findLatestCodexDatabase(roots.codex);
  return [
    join(roots.claude, "history.jsonl"),
    join(roots.claude, "projects"),
    join(roots.claude, "sessions"),
    join(roots.codex, "history.jsonl"),
    join(roots.codex, "session_index.jsonl"),
    join(roots.codex, "sessions"),
    join(roots.codex, "process_manager", "chat_processes.json"),
    ...(codexDatabase ? [codexDatabase, `${codexDatabase}-wal`] : []),
  ];
}

async function listClaudeSessions(claudeRoot: string): Promise<ChatSession[]> {
  const projectsRoot = join(claudeRoot, "projects");
  if (!(await pathExists(projectsRoot))) return [];

  const [history, registeredActiveIds, processActiveIds, projectDirectories] = await Promise.all([
    loadClaudeHistory(join(claudeRoot, "history.jsonl")),
    loadClaudeActiveIds(join(claudeRoot, "sessions")),
    loadLiveProcessSessionIds().then((sessions) => sessions.claude),
    fs.readdir(projectsRoot, { withFileTypes: true }),
  ]);
  const activeIds = new Set([...registeredActiveIds, ...processActiveIds]);

  const sourcePaths: string[] = [];
  await Promise.all(
    projectDirectories
      .filter((entry) => entry.isDirectory())
      .map(async (projectDirectory) => {
        const projectPath = join(projectsRoot, projectDirectory.name);
        const entries = await safeReadDirectory(projectPath);
        for (const entry of entries) {
          if (entry.isFile() && CLAUDE_SESSION_PATTERN.test(entry.name))
            sourcePaths.push(join(projectPath, entry.name));
        }
      }),
  );

  return mapWithConcurrency(sourcePaths, 20, async (sourcePath) => {
    const id = basename(sourcePath, ".jsonl");
    const historyEntry = history.get(id);
    const [fileStats, head] = await Promise.all([fs.stat(sourcePath), readSessionHead(sourcePath, "claude")]);
    const cwd = head.cwd || historyEntry?.project || "";
    const firstPrompt = head.firstPrompt || historyEntry?.firstPrompt || "";
    const title = chooseTitle(head.title, firstPrompt, "Claude Conversation");

    return {
      id,
      provider: "claude" as const,
      title,
      preview: compactText(historyEntry?.lastPrompt || firstPrompt, 300),
      projectName: projectName(cwd, sourcePath),
      cwd: cwd || homedir(),
      sourcePath,
      createdAt: head.timestamp || historyEntry?.firstTimestamp || fileStats.birthtimeMs,
      updatedAt: Math.max(fileStats.mtimeMs, historyEntry?.lastTimestamp || 0),
      size: fileStats.size,
      userMessageCount: historyEntry?.count || 0,
      isActive: activeIds.has(id),
      model: head.model,
      cliVersion: head.cliVersion,
    };
  });
}

async function listCodexSessions(codexRoot: string): Promise<ChatSession[]> {
  const sessionsRoot = join(codexRoot, "sessions");
  if (!(await pathExists(sessionsRoot))) return [];
  const codexDatabase = findLatestCodexDatabase(codexRoot);

  const [history, titles, databaseEntries, registeredActiveIds, processActiveIds, sourcePaths] = await Promise.all([
    loadCodexHistory(join(codexRoot, "history.jsonl")),
    loadCodexTitles(join(codexRoot, "session_index.jsonl")),
    codexDatabase ? loadCodexDatabase(codexDatabase) : Promise.resolve(new Map()),
    loadCodexActiveIds(join(codexRoot, "process_manager", "chat_processes.json")),
    loadLiveProcessSessionIds().then((sessions) => sessions.codex),
    findFilesRecursively(sessionsRoot, (fileName) => CODEX_SESSION_ID_PATTERN.test(fileName)),
  ]);
  const activeIds = new Set([...registeredActiveIds, ...processActiveIds]);

  const visibleSourcePaths = sourcePaths.filter((sourcePath) => {
    const id = sourcePath.match(CODEX_SESSION_ID_PATTERN)?.[1] || basename(sourcePath, ".jsonl");
    return !databaseEntries.get(id)?.isInternalSubagent;
  });

  const sessions = await mapWithConcurrency(visibleSourcePaths, 20, async (sourcePath) => {
    const id = sourcePath.match(CODEX_SESSION_ID_PATTERN)?.[1] || basename(sourcePath, ".jsonl");
    const historyEntry = history.get(id);
    const databaseEntry = databaseEntries.get(id);
    const [fileStats, head] = await Promise.all([
      fs.stat(sourcePath),
      databaseEntry ? Promise.resolve({} as SessionHead) : readSessionHead(sourcePath, "codex"),
    ]);
    if (head.isInternalSubagent) return undefined;
    const cwd = databaseEntry?.cwd || head.cwd || "";
    const firstPrompt = databaseEntry?.firstPrompt || historyEntry?.firstPrompt || head.firstPrompt || "";
    const title = chooseTitle(databaseEntry?.title || titles.get(id), firstPrompt, "Codex Conversation");
    const preview = databaseEntry?.preview || historyEntry?.lastPrompt || firstPrompt;

    return {
      id,
      provider: "codex" as const,
      title,
      preview: compactText(preview, 300),
      projectName: projectName(cwd, sourcePath),
      cwd: cwd || homedir(),
      sourcePath,
      createdAt: databaseEntry?.createdAt || head.timestamp || historyEntry?.firstTimestamp || fileStats.birthtimeMs,
      updatedAt: Math.max(fileStats.mtimeMs, databaseEntry?.updatedAt || 0, historyEntry?.lastTimestamp || 0),
      size: fileStats.size,
      userMessageCount: historyEntry?.count || 0,
      isActive: activeIds.has(id),
      model: databaseEntry?.model || head.model,
      cliVersion: databaseEntry?.cliVersion || head.cliVersion,
    };
  });

  const uniqueSessions = new Map<string, ChatSession>();
  for (const session of sessions) {
    if (!session) continue;
    const existing = uniqueSessions.get(session.id);
    if (!existing || session.updatedAt > existing.updatedAt) uniqueSessions.set(session.id, session);
  }
  return [...uniqueSessions.values()];
}

async function loadClaudeHistory(historyPath: string): Promise<Map<string, HistoryEntry>> {
  return loadHistoryFile(historyPath, (record) => {
    const sessionId = stringValue(record.sessionId);
    const prompt = stringValue(record.display);
    return sessionId && prompt
      ? {
          sessionId,
          prompt,
          timestamp: numberValue(record.timestamp),
          project: stringValue(record.project),
        }
      : undefined;
  });
}

async function loadCodexHistory(historyPath: string): Promise<Map<string, HistoryEntry>> {
  return loadHistoryFile(historyPath, (record) => {
    const sessionId = stringValue(record.session_id);
    const prompt = stringValue(record.text);
    const seconds = numberValue(record.ts);
    return sessionId && prompt
      ? { sessionId, prompt, timestamp: seconds ? seconds * 1_000 : 0, project: "" }
      : undefined;
  });
}

async function loadHistoryFile(
  historyPath: string,
  extract: (
    record: Record<string, unknown>,
  ) => { sessionId: string; prompt: string; timestamp: number; project: string } | undefined,
): Promise<Map<string, HistoryEntry>> {
  const history = new Map<string, HistoryEntry>();
  if (!(await pathExists(historyPath))) return history;

  await forEachJsonLine(historyPath, (record) => {
    const extracted = extract(record);
    if (!extracted) return;
    const prompt = compactText(extracted.prompt, MAX_HISTORY_PROMPT_CHARACTERS);

    const existing = history.get(extracted.sessionId);
    if (!existing) {
      history.set(extracted.sessionId, {
        firstPrompt: prompt,
        lastPrompt: prompt,
        firstTimestamp: extracted.timestamp,
        lastTimestamp: extracted.timestamp,
        project: extracted.project,
        count: 1,
      });
      return;
    }

    existing.lastPrompt = prompt;
    existing.lastTimestamp = Math.max(existing.lastTimestamp, extracted.timestamp);
    existing.firstTimestamp = Math.min(existing.firstTimestamp || extracted.timestamp, extracted.timestamp);
    existing.project ||= extracted.project;
    existing.count += 1;
  });

  return history;
}

async function loadCodexTitles(indexPath: string): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  if (!(await pathExists(indexPath))) return titles;

  await forEachJsonLine(indexPath, (record) => {
    const id = stringValue(record.id);
    const title = stringValue(record.thread_name);
    if (id && title) titles.set(id, title);
  });
  return titles;
}

async function loadCodexDatabase(databasePath: string): Promise<Map<string, CodexDatabaseEntry>> {
  if (!(await pathExists(databasePath))) return new Map();

  try {
    const [databaseStats, walStats] = await Promise.all([
      fs.stat(databasePath),
      fs.stat(`${databasePath}-wal`).catch(() => undefined),
    ]);
    const signature = `${databasePath}:${databaseStats.mtimeMs}:${databaseStats.size}:${walStats?.mtimeMs || 0}:${walStats?.size || 0}`;
    if (codexDatabaseCache?.signature === signature) return codexDatabaseCache.entries;

    const { stdout } = await executeFile("/usr/bin/sqlite3", ["-json", databasePath, "SELECT * FROM threads"], {
      maxBuffer: 20 * 1_024 * 1_024,
    });
    const rows: unknown = JSON.parse(stdout || "[]");
    const entries = new Map<string, CodexDatabaseEntry>();

    if (Array.isArray(rows)) {
      for (const value of rows) {
        const row = objectValue(value);
        const id = stringValue(row?.id);
        if (!row || !id) continue;

        entries.set(id, {
          id,
          title: stringValue(row.title),
          preview: stringValue(row.preview),
          firstPrompt: stringValue(row.first_user_message),
          cwd: stringValue(row.cwd),
          createdAt: epochValue(row.created_at_ms) || epochValue(row.created_at),
          updatedAt: epochValue(row.updated_at_ms) || epochValue(row.updated_at),
          cliVersion: stringValue(row.cli_version) || undefined,
          model: stringValue(row.model) || undefined,
          isInternalSubagent: stringValue(row.thread_source) === "subagent" || isCodexInternalSubagent(row.source),
        });
      }
    }

    codexDatabaseCache = { signature, entries };
    return entries;
  } catch {
    return new Map();
  }
}

function isCodexInternalSubagent(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const source = value.trim();
  if (!source) return false;

  try {
    const parsed = JSON.parse(source);
    return Boolean(objectValue(parsed)?.subagent);
  } catch {
    return source === "subagent" || source.startsWith("subagent:");
  }
}

async function loadClaudeActiveIds(sessionsDirectory: string): Promise<Set<string>> {
  const activeIds = new Set<string>();
  const entries = await safeReadDirectory(sessionsDirectory);

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        const record = await readJsonFile(join(sessionsDirectory, entry.name));
        const id = stringValue(record?.sessionId);
        const processId = numberValue(record?.pid);
        const updatedAt = numberValue(record?.updatedAt);
        if (id && isProcessActive(processId, updatedAt)) activeIds.add(id);
      }),
  );

  return activeIds;
}

async function loadCodexActiveIds(processPath: string): Promise<Set<string>> {
  const activeIds = new Set<string>();
  const records = await readJsonArray(processPath);

  for (const record of records) {
    const id = stringValue(record.conversationId);
    const processId = numberValue(record.osPid);
    const updatedAt = numberValue(record.updatedAtMs);
    if (id && isProcessActive(processId, updatedAt)) activeIds.add(id);
  }

  return activeIds;
}

function isProcessActive(processId: number, updatedAt: number): boolean {
  if (!processId) return updatedAt > Date.now() - 120_000;
  try {
    process.kill(processId, 0);
    return true;
  } catch {
    return updatedAt > Date.now() - 30_000;
  }
}

async function loadLiveProcessSessionIds(): Promise<LiveProcessSessions> {
  if (liveProcessSessionsCache && liveProcessSessionsCache.expiresAt > Date.now()) {
    return liveProcessSessionsCache.value;
  }
  if (liveProcessSessionsPromise) return liveProcessSessionsPromise;

  liveProcessSessionsPromise = inspectLiveProcessSessions()
    .then((value) => {
      liveProcessSessionsCache = { expiresAt: Date.now() + 5_000, value };
      return value;
    })
    .finally(() => {
      liveProcessSessionsPromise = undefined;
    });
  return liveProcessSessionsPromise;
}

async function inspectLiveProcessSessions(): Promise<LiveProcessSessions> {
  const sessions: LiveProcessSessions = { claude: new Set(), codex: new Set() };
  try {
    const { stdout } = await executeFile("/bin/ps", ["-ax", "-o", "pid=,tty=,command="], {
      timeout: 3_000,
      maxBuffer: 2 * 1_024 * 1_024,
    });
    const candidates: Array<{ processId: string; provider: ChatProvider }> = [];

    for (const line of stdout.split("\n")) {
      const match = line.match(/^\s*(\d+)\s+(\S+)\s+(.+)$/);
      if (!match || match[2] === "??") continue;
      const [, processId, , command] = match;
      const provider = processProvider(command);
      if (!provider) continue;
      candidates.push({ processId, provider });
      for (const idMatch of command.matchAll(SESSION_ID_GLOBAL_PATTERN)) sessions[provider].add(idMatch[0]);
    }

    await mapWithConcurrency(candidates, 4, async ({ processId, provider }) => {
      try {
        const { stdout: openFiles } = await executeFile("/usr/sbin/lsof", ["-Fn", "-p", processId], {
          timeout: 2_000,
          maxBuffer: 4 * 1_024 * 1_024,
        });
        for (const line of openFiles.split("\n")) {
          if (!line.startsWith("n") || !line.endsWith(".jsonl")) continue;
          const sourcePath = line.slice(1);
          if (provider === "codex" && !sourcePath.includes("/sessions/")) continue;
          if (provider === "claude" && !sourcePath.includes("/projects/")) continue;
          const id = sourcePath.match(SESSION_ID_GLOBAL_PATTERN)?.[0];
          if (id) sessions[provider].add(id);
        }
      } catch {
        return;
      }
    });
  } catch {
    return sessions;
  }
  return sessions;
}

async function loadRegisteredProcessIds(session: ChatSession): Promise<Set<number>> {
  const processIds = new Set<number>();
  const dataRoot = dataRootFromSessionSource(session);
  if (!dataRoot) return processIds;

  if (session.provider === "claude") {
    const entries = await safeReadDirectory(join(dataRoot, "sessions"));
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map(async (entry) => {
          const record = await readJsonFile(join(dataRoot, "sessions", entry.name));
          if (stringValue(record?.sessionId) !== session.id) return;
          const processId = numberValue(record?.pid);
          if (processId > 0) processIds.add(processId);
        }),
    );
    return processIds;
  }

  const records = await readJsonArray(join(dataRoot, "process_manager", "chat_processes.json"));
  for (const record of records) {
    if (stringValue(record.conversationId) !== session.id) continue;
    const processId = numberValue(record.osPid);
    if (processId > 0) processIds.add(processId);
  }
  return processIds;
}

async function loadProcessEntries(): Promise<ProcessEntry[]> {
  const { stdout } = await executeFile("/bin/ps", ["-ax", "-o", "pid=,tty=,command="], {
    timeout: 3_000,
    maxBuffer: 2 * 1_024 * 1_024,
  });
  const entries: ProcessEntry[] = [];

  for (const line of stdout.split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(\S+)\s+(.+)$/);
    if (!match) continue;
    entries.push({ processId: Number(match[1]), tty: match[2], command: match[3] });
  }
  return entries;
}

async function processHasSessionFile(processId: number, session: ChatSession): Promise<boolean> {
  try {
    const { stdout } = await executeFile("/usr/sbin/lsof", ["-Fn", "-p", String(processId)], {
      timeout: 2_000,
      maxBuffer: 4 * 1_024 * 1_024,
    });
    const expectedBasename = basename(session.sourcePath);
    return stdout.split("\n").some((line) => {
      if (!line.startsWith("n") || !line.endsWith(".jsonl")) return false;
      const sourcePath = line.slice(1);
      return sourcePath === session.sourcePath || basename(sourcePath) === expectedBasename;
    });
  } catch {
    return false;
  }
}

function dataRootFromSessionSource(session: ChatSession): string | undefined {
  const directoryName = session.provider === "claude" ? "projects" : "sessions";
  const marker = `/${directoryName}/`;
  const markerIndex = session.sourcePath.lastIndexOf(marker);
  return markerIndex >= 0 ? session.sourcePath.slice(0, markerIndex) : undefined;
}

function processCommandMatchesProvider(command: string, provider: ChatProvider): boolean {
  if (provider === "codex") return /(?:^|[/\s'"])codex(?:\.app)?(?:[/\s'"]|$)/iu.test(command);
  return /(?:^|[/\s'"])(?:claude(?:\.app)?|claude-code)(?:[/\s'"]|$)/iu.test(command);
}

function processProvider(command: string): ChatProvider | undefined {
  if (/\bcodex\b/i.test(command) && /\bresume\b/i.test(command)) return "codex";
  if (/\bclaude\b/i.test(command) && /(?:--resume|-r\b)/i.test(command)) return "claude";
  return undefined;
}

async function readSessionHead(sourcePath: string, provider: ChatProvider): Promise<SessionHead> {
  const cached = sessionHeadCache.get(sourcePath);
  if (cached) return cached;

  const text = await readRange(sourcePath, 0, HEAD_BYTES);
  const completeText = text.includes("\n") ? text.slice(0, text.lastIndexOf("\n")) : text;
  const head: SessionHead = {};

  for (const line of completeText.split("\n")) {
    const record = parseJsonRecord(line);
    if (!record) continue;

    if (provider === "claude") updateClaudeHead(head, record);
    else updateCodexHead(head, record);
  }

  if (!head.cwd) head.cwd = extractJsonString(text, "cwd");
  if (!head.cliVersion) head.cliVersion = extractJsonString(text, provider === "claude" ? "version" : "cli_version");

  sessionHeadCache.set(sourcePath, head);
  return head;
}

function updateClaudeHead(head: SessionHead, record: Record<string, unknown>): void {
  const recordType = stringValue(record.type);
  if (recordType === "ai-title") head.title = stringValue(record.aiTitle) || head.title;

  if ((recordType === "user" || recordType === "assistant") && !head.cwd) {
    head.cwd = stringValue(record.cwd);
    head.timestamp = dateValue(record.timestamp) || head.timestamp;
    head.cliVersion = stringValue(record.version) || head.cliVersion;
  }

  const message = objectValue(record.message);
  if (recordType === "assistant" && message && !head.model) head.model = stringValue(message.model);
  if (recordType === "user" && !head.firstPrompt && !record.isMeta) {
    head.firstPrompt = extractClaudeContent(message?.content);
  }
}

function updateCodexHead(head: SessionHead, record: Record<string, unknown>): void {
  const recordType = stringValue(record.type);
  const payload = objectValue(record.payload);
  if (!payload) return;

  if (recordType === "session_meta") {
    head.cwd = stringValue(payload.cwd) || head.cwd;
    head.timestamp = dateValue(payload.timestamp) || head.timestamp;
    head.cliVersion = stringValue(payload.cli_version) || head.cliVersion;
    head.isInternalSubagent ||=
      stringValue(payload.thread_source) === "subagent" ||
      Boolean(stringValue(payload.parent_thread_id)) ||
      Boolean(objectValue(payload.source)?.subagent);
  }

  if (recordType === "turn_context" && !head.model) head.model = stringValue(payload.model);
  if (recordType === "event_msg" && stringValue(payload.type) === "user_message" && !head.firstPrompt) {
    head.firstPrompt = stringValue(payload.message);
  }
}

async function readTranscriptText(
  sourcePath: string,
  fileSize: number,
): Promise<{ segments: string[]; truncated: boolean; parsedBytes: number; keepTrailingLine: boolean }> {
  if (fileSize <= FULL_TRANSCRIPT_BYTES) {
    const text = await fs.readFile(sourcePath, "utf8");
    return { segments: [text], truncated: false, parsedBytes: fileSize, keepTrailingLine: true };
  }

  const headBytes = Math.min(HEAD_BYTES, fileSize);
  const tailBytes = Math.min(TAIL_TRANSCRIPT_BYTES, fileSize - headBytes);
  const [headText, rawTailText] = await Promise.all([
    readRange(sourcePath, 0, headBytes),
    readRange(sourcePath, fileSize - tailBytes, tailBytes),
  ]);
  const firstNewline = rawTailText.indexOf("\n");
  const tailText = firstNewline >= 0 ? rawTailText.slice(firstNewline + 1) : "";

  return {
    segments: [headText.slice(0, headText.lastIndexOf("\n") + 1), tailText],
    truncated: true,
    parsedBytes: headBytes + tailBytes,
    keepTrailingLine: true,
  };
}

function parseTranscriptSegments(
  provider: ChatProvider,
  segments: string[],
  keepTrailingLine: boolean,
): { messages: ChatMessage[]; trailingLine: string } {
  const messages: ChatMessage[] = [];
  let trailingLine = "";

  for (const [segmentIndex, segment] of segments.entries()) {
    const parsed = parseTranscriptText(provider, segment, keepTrailingLine && segmentIndex === segments.length - 1);
    messages.push(...parsed.messages);
    if (segmentIndex === segments.length - 1) trailingLine = parsed.trailingLine;
  }

  return { messages, trailingLine };
}

function parseTranscriptText(
  provider: ChatProvider,
  text: string,
  keepTrailingLine: boolean,
): { messages: ChatMessage[]; trailingLine: string } {
  const endsWithNewline = text.endsWith("\n");
  const lines = text.split("\n");
  const trailingLine = keepTrailingLine && !endsWithNewline ? lines.pop() || "" : "";
  const messages: ChatMessage[] = [];

  for (const line of lines) {
    if (line.length > MAX_JSON_LINE_CHARACTERS) continue;
    const record = parseJsonRecord(line);
    if (!record) continue;
    const extracted = provider === "claude" ? extractClaudeMessage(record) : extractCodexMessage(record);
    if (extracted) messages.push(extracted);
  }

  return { messages, trailingLine };
}

function extractClaudeMessage(record: Record<string, unknown>): ChatMessage | undefined {
  const recordType = stringValue(record.type);
  if (recordType !== "user" && recordType !== "assistant") return undefined;
  if (record.isMeta || record.isSidechain) return undefined;

  const message = objectValue(record.message);
  if (!message) return undefined;
  const content = extractClaudeContent(message.content);
  if (!content.trim()) return undefined;

  return {
    id: stringValue(record.uuid) || `${recordType}-${stringValue(record.timestamp)}-${content.slice(0, 40)}`,
    role: recordType,
    content,
    timestamp: dateValue(record.timestamp),
    model: recordType === "assistant" ? stringValue(message.model) : undefined,
  };
}

function extractClaudeContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((block) => {
      const contentBlock = objectValue(block);
      return contentBlock && stringValue(contentBlock.type) === "text" ? stringValue(contentBlock.text) : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function extractCodexMessage(record: Record<string, unknown>): ChatMessage | undefined {
  const recordType = stringValue(record.type);
  const payload = objectValue(record.payload);
  if (!payload) return undefined;
  const timestamp = dateValue(record.timestamp);

  if (recordType === "event_msg") {
    const eventType = stringValue(payload.type);
    if (eventType !== "user_message" && eventType !== "agent_message") return undefined;
    const content = stringValue(payload.message);
    if (!content.trim()) return undefined;
    return {
      id: `${eventType}-${timestamp}-${content.slice(0, 40)}`,
      role: eventType === "user_message" ? "user" : "assistant",
      content,
      timestamp,
    };
  }

  if (recordType !== "response_item" || stringValue(payload.type) !== "message") return undefined;
  const role = stringValue(payload.role);
  if (role !== "user" && role !== "assistant") return undefined;
  const content = extractCodexContent(payload.content);
  if (!content.trim()) return undefined;

  return {
    id: stringValue(payload.id) || `${role}-${timestamp}-${content.slice(0, 40)}`,
    role,
    content,
    timestamp,
  };
}

function extractCodexContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((block) => {
      const contentBlock = objectValue(block);
      const blockType = stringValue(contentBlock?.type);
      return blockType === "input_text" || blockType === "output_text" ? stringValue(contentBlock?.text) : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function deduplicateMessages(messages: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  return messages.filter((message) => {
    const normalizedContent = message.content.replace(/\s+/g, " ").trim();
    const key = `${message.role}:${message.timestamp || ""}:${normalizedContent}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function limitTranscriptMessages(messages: ChatMessage[]): { messages: ChatMessage[]; truncated: boolean } {
  let truncated = false;
  const compacted = messages.map((message) => {
    const content = limitMessageContent(message.content);
    if (content !== message.content) truncated = true;
    return content === message.content ? message : { ...message, content };
  });
  const unique = deduplicateMessages(compacted);
  if (unique.length !== compacted.length) truncated = true;

  const selected: ChatMessage[] = [];
  let totalCharacters = 0;
  for (let index = unique.length - 1; index >= 0; index -= 1) {
    const message = unique[index];
    if (selected.length >= MAX_TRANSCRIPT_MESSAGES) {
      truncated = true;
      break;
    }
    if (selected.length > 0 && totalCharacters + message.content.length > MAX_TRANSCRIPT_CHARACTERS) {
      truncated = true;
      break;
    }
    selected.push(message);
    totalCharacters += message.content.length;
  }

  if (selected.length !== unique.length) truncated = true;
  selected.reverse();
  return { messages: selected, truncated };
}

function limitMessageContent(content: string): string {
  if (content.length <= MAX_MESSAGE_CHARACTERS) return content;
  const marker = "\n\n[… content shortened to stay within Raycast's memory limit …]\n\n";
  const availableCharacters = MAX_MESSAGE_CHARACTERS - marker.length;
  const headCharacters = Math.ceil(availableCharacters * 0.6);
  const tailCharacters = availableCharacters - headCharacters;
  return `${content.slice(0, headCharacters)}${marker}${content.slice(-tailCharacters)}`;
}

function limitTrailingLine(line: string): string {
  return line.length <= MAX_TRAILING_LINE_CHARACTERS ? line : "";
}

function cacheTranscript(sourcePath: string, transcript: TranscriptCacheEntry): void {
  transcriptCache.delete(sourcePath);
  transcriptCache.set(sourcePath, transcript);
  while (transcriptCache.size > MAX_TRANSCRIPT_CACHE_ENTRIES) {
    const oldestPath = transcriptCache.keys().next().value;
    if (!oldestPath) break;
    transcriptCache.delete(oldestPath);
  }
}

async function forEachJsonLine(sourcePath: string, callback: (record: Record<string, unknown>) => void): Promise<void> {
  const input = createReadStream(sourcePath, { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Infinity });

  for await (const line of lines) {
    const record = parseJsonRecord(line);
    if (record) callback(record);
  }
}

async function findFilesRecursively(rootPath: string, include: (fileName: string) => boolean): Promise<string[]> {
  const matches: string[] = [];
  const pendingDirectories = [rootPath];

  while (pendingDirectories.length > 0) {
    const directoryPath = pendingDirectories.pop();
    if (!directoryPath) continue;
    const entries = await safeReadDirectory(directoryPath);
    for (const entry of entries) {
      const entryPath = join(directoryPath, entry.name);
      if (entry.isDirectory()) pendingDirectories.push(entryPath);
      else if (entry.isFile() && include(entry.name)) matches.push(entryPath);
    }
  }

  return matches;
}

async function mapWithConcurrency<Input, Output>(
  values: Input[],
  concurrency: number,
  mapper: (value: Input) => Promise<Output>,
): Promise<Output[]> {
  const results = new Array<Output>(values.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(values[currentIndex]);
    }
  });

  await Promise.all(workers);
  return results;
}

async function readRange(sourcePath: string, position: number, length: number): Promise<string> {
  if (length <= 0) return "";
  const file = await fs.open(sourcePath, "r");
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await file.read(buffer, 0, length, position);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await file.close();
  }
}

async function readJsonFile(sourcePath: string): Promise<Record<string, unknown> | undefined> {
  try {
    const value: unknown = JSON.parse(await fs.readFile(sourcePath, "utf8"));
    return objectValue(value);
  } catch {
    return undefined;
  }
}

async function readJsonArray(sourcePath: string): Promise<Record<string, unknown>[]> {
  try {
    const value: unknown = JSON.parse(await fs.readFile(sourcePath, "utf8"));
    return Array.isArray(value)
      ? value.map((item) => objectValue(item)).filter((item): item is Record<string, unknown> => Boolean(item))
      : [];
  } catch {
    return [];
  }
}

async function safeReadDirectory(directoryPath: string) {
  try {
    return await fs.readdir(directoryPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function pathExists(sourcePath: string): Promise<boolean> {
  try {
    await fs.access(sourcePath);
    return true;
  } catch {
    return false;
  }
}

function parseJsonRecord(line: string): Record<string, unknown> | undefined {
  if (!line.trim()) return undefined;
  try {
    return objectValue(JSON.parse(line));
  } catch {
    return undefined;
  }
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function dateValue(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function epochValue(value: unknown): number {
  const timestamp = numberValue(value);
  if (!timestamp) return 0;
  return timestamp > 10_000_000_000 ? timestamp : timestamp * 1_000;
}

function extractJsonString(text: string, key: string): string | undefined {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`"${escapedKey}"\\s*:\\s*("(?:\\\\.|[^"\\\\])*")`));
  if (!match) return undefined;
  try {
    return JSON.parse(match[1]);
  } catch {
    return undefined;
  }
}

function chooseTitle(preferred: string | undefined, firstPrompt: string | undefined, fallback: string): string {
  const candidate = preferred || firstPrompt || fallback;
  return compactText(candidate, 88) || fallback;
}

function findLatestCodexDatabase(codexRoot: string): string | undefined {
  try {
    const candidates = readdirSync(codexRoot)
      .map((fileName) => {
        const match = fileName.match(/^state_(\d+)\.sqlite$/);
        return match ? { fileName, version: Number(match[1]) } : undefined;
      })
      .filter((candidate): candidate is { fileName: string; version: number } => Boolean(candidate))
      .sort((first, second) => second.version - first.version);
    return candidates[0] ? join(codexRoot, candidates[0].fileName) : undefined;
  } catch {
    return undefined;
  }
}

function expandHome(sourcePath: string): string {
  if (sourcePath === "~") return homedir();
  if (sourcePath.startsWith("~/")) return join(homedir(), sourcePath.slice(2));
  return sourcePath;
}
