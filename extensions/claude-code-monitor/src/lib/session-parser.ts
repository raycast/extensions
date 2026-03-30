import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";
import { SessionMetadata, SessionDetail, SessionMessage } from "../types";
import { calculateEntryCost } from "./pricing";
import {
  RE_INPUT_TOKENS,
  RE_OUTPUT_TOKENS,
  RE_CACHE_READ,
  RE_CACHE_CREATION,
  RE_MODEL,
  RE_TYPE_ASSISTANT,
  RE_TYPE_USER,
  RE_GIT_BRANCH,
  sumAllMatches,
  countMatches,
  lastMatch,
} from "./jsonl-utils";

interface JSONLEntry {
  type: string;
  summary?: string;
  leafUuid?: string;
  uuid?: string;
  message?: {
    role: string;
    model?: string;
    content: string | Array<{ type: string; text?: string }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };
  timestamp?: string;
  gitBranch?: string;
}

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");

// Cache resolved paths
const resolvedPathCache = new Map<string, string>();

export function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/[/.]/g, "-");
}

export function getProjectName(projectPath: string): string {
  return path.basename(projectPath) || projectPath;
}

/**
 * Resolve encoded dir name to original path.
 * Priority: sessions-index.json > filesystem walk > naive decode
 */
export async function resolveProjectPath(
  encodedDirName: string,
): Promise<string> {
  const cached = resolvedPathCache.get(encodedDirName);
  if (cached) return cached;

  // 1. Try sessions-index.json
  try {
    const indexPath = path.join(
      PROJECTS_DIR,
      encodedDirName,
      "sessions-index.json",
    );
    const content = await fs.promises.readFile(indexPath, "utf8");
    const index = JSON.parse(content);
    if (index.originalPath && typeof index.originalPath === "string") {
      resolvedPathCache.set(encodedDirName, index.originalPath);
      return index.originalPath;
    }
  } catch {
    // Continue to next strategy
  }

  // 2. Try filesystem-guided resolution
  const fsResolved = await resolveByFilesystemWalk(encodedDirName);
  if (fsResolved) {
    resolvedPathCache.set(encodedDirName, fsResolved);
    return fsResolved;
  }

  // 3. Naive decode (last resort)
  const decoded = "/" + encodedDirName.slice(1).replace(/-/g, "/");
  try {
    await fs.promises.access(decoded);
    resolvedPathCache.set(encodedDirName, decoded);
  } catch {
    // Don't cache lossy results
  }
  return decoded;
}

async function resolveByFilesystemWalk(
  encodedDirName: string,
): Promise<string | null> {
  const homedir = os.homedir();
  const encodedHome = encodeProjectPath(homedir);

  if (!encodedDirName.startsWith(encodedHome)) return null;

  const remainder = encodedDirName.slice(encodedHome.length);
  if (!remainder) return homedir;
  if (remainder[0] !== "-") return null;

  const rest = remainder.slice(1);
  if (!rest) return homedir;

  return walkPathSegments(homedir, rest.split("-"));
}

async function walkPathSegments(
  basePath: string,
  parts: string[],
): Promise<string | null> {
  if (parts.length === 0) return basePath;

  for (let take = parts.length; take >= 1; take--) {
    const componentParts = parts.slice(0, take);
    const remaining = parts.slice(take);

    let component = componentParts.join("-");
    if (component.startsWith("-")) {
      component = "." + component.slice(1);
    } else if (component === "") {
      continue;
    }

    const candidatePath = path.join(basePath, component);
    try {
      const stat = await fs.promises.stat(candidatePath);
      if (remaining.length === 0) return candidatePath;
      if (stat.isDirectory()) {
        const resolved = await walkPathSegments(candidatePath, remaining);
        if (resolved) return resolved;
      }
    } catch {
      // Continue trying
    }
  }
  return null;
}

export async function listProjectDirs(): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(PROJECTS_DIR, {
      withFileTypes: true,
    });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

export async function listSessionFiles(
  encodedProjectPath: string,
): Promise<string[]> {
  const projectDir = path.join(PROJECTS_DIR, encodedProjectPath);
  try {
    const entries = await fs.promises.readdir(projectDir);
    return entries.filter((e) => e.endsWith(".jsonl"));
  } catch {
    return [];
  }
}

// Disk-based usage cache to avoid re-parsing unchanged files
interface SessionParserCacheEntry {
  mtime: number;
  turnCount: number;
  cost: number;
  model?: string;
  summary: string;
  firstMessage: string;
  gitBranch?: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  id?: string;
}

const USAGE_CACHE_FILE = path.join(
  os.homedir(),
  ".claude",
  "claude-code-monitor",
  "usage-cache.json",
);

let usageCache: Record<string, SessionParserCacheEntry> | null = null;
let usageCacheDirty = false;

async function loadUsageCache(): Promise<
  Record<string, SessionParserCacheEntry>
> {
  if (usageCache) return usageCache;
  try {
    const data = await fs.promises.readFile(USAGE_CACHE_FILE, "utf8");
    usageCache = JSON.parse(data);
    return usageCache!;
  } catch {
    usageCache = {};
    return usageCache;
  }
}

async function flushUsageCache(): Promise<void> {
  if (!usageCacheDirty || !usageCache) return;
  try {
    const dir = path.dirname(USAGE_CACHE_FILE);
    await fs.promises.mkdir(dir, { recursive: true });
    const tmp = USAGE_CACHE_FILE + ".tmp";
    await fs.promises.writeFile(tmp, JSON.stringify(usageCache), "utf8");
    await fs.promises.rename(tmp, USAGE_CACHE_FILE);
    usageCacheDirty = false;
  } catch {
    // Ignore cache write failures
  }
}

async function parseSessionMetadataFast(
  filePath: string,
  mtime?: Date,
): Promise<Partial<SessionMetadata>> {
  // Check disk cache
  const cache = await loadUsageCache();
  const mtimeMs = mtime?.getTime() || 0;
  const cached = cache[filePath];
  if (cached && cached.mtime === mtimeMs) {
    return {
      id: cached.id,
      turnCount: cached.turnCount,
      cost: cached.cost,
      model: cached.model,
      summary: cached.summary,
      firstMessage: cached.firstMessage,
      gitBranch: cached.gitBranch,
      inputTokens: cached.inputTokens || undefined,
      outputTokens: cached.outputTokens || undefined,
      cacheReadTokens: cached.cacheReadTokens || undefined,
      cacheCreationTokens: cached.cacheCreationTokens || undefined,
    };
  }

  const result: Partial<SessionMetadata> = {};
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheCreationTokens = 0;
  let totalCost = 0;
  let model: string | undefined;
  let userTurns = 0;
  let assistantTurns = 0;

  // --- Pass 1: read first 8KB for metadata (summary, firstMessage) ---
  const HEAD_SIZE = 8192;
  let fd: fs.promises.FileHandle | null = null;
  try {
    fd = await fs.promises.open(filePath, "r");
    const headBuf = Buffer.alloc(HEAD_SIZE);
    const { bytesRead: headRead } = await fd.read(headBuf, 0, HEAD_SIZE, 0);
    const head = headBuf.toString("utf8", 0, headRead);
    const headLines = head.split("\n");

    for (const line of headLines) {
      if (!line.trim() || line.length > 50000) continue;
      try {
        const entry: JSONLEntry = JSON.parse(line);
        if (entry.type === "summary") {
          result.summary = entry.summary || "";
          result.id = entry.leafUuid || path.basename(filePath, ".jsonl");
        }
        if (
          (entry.type === "user" || entry.type === "human") &&
          !result.firstMessage &&
          entry.message?.content
        ) {
          const content = entry.message.content;
          if (typeof content === "string") {
            result.firstMessage = content.slice(0, 200);
          } else if (Array.isArray(content)) {
            const textBlock = content.find((b) => b.type === "text");
            result.firstMessage = textBlock?.text?.slice(0, 200) || "";
          }
        }
      } catch {
        // Skip
      }
    }

    // --- Pass 2: chunk-based scan for tokens (fixed 256KB memory) ---
    const CHUNK_SIZE = 256 * 1024;
    const buf = Buffer.alloc(CHUNK_SIZE);
    const stat = await fd.stat();
    const fileSize = stat.size;
    let pos = 0;
    let carry = "";

    while (pos < fileSize) {
      const { bytesRead } = await fd.read(buf, 0, CHUNK_SIZE, pos);
      if (bytesRead === 0) break;
      const text = carry + buf.toString("utf8", 0, bytesRead);

      // Sum token fields across all occurrences in this chunk
      inputTokens += sumAllMatches(text, RE_INPUT_TOKENS());
      outputTokens += sumAllMatches(text, RE_OUTPUT_TOKENS());
      cacheReadTokens += sumAllMatches(text, RE_CACHE_READ());
      cacheCreationTokens += sumAllMatches(text, RE_CACHE_CREATION());

      // Count turns
      assistantTurns += countMatches(text, RE_TYPE_ASSISTANT());
      userTurns += countMatches(text, RE_TYPE_USER());

      // Extract model (keep last seen)
      const m = lastMatch(text, RE_MODEL());
      if (m) model = m;

      // Extract gitBranch
      if (!result.gitBranch) {
        const gb = text.match(RE_GIT_BRANCH);
        if (gb) result.gitBranch = gb[1];
      }

      // Keep only the incomplete trailing line for boundary handling
      const lastNewline = text.lastIndexOf("\n");
      carry = lastNewline >= 0 ? text.slice(lastNewline + 1) : text;
      pos += bytesRead;
    }
  } catch {
    // File read error, return what we have
  } finally {
    if (fd) await fd.close();
  }

  // Calculate cost from total tokens
  if (model && (inputTokens || outputTokens)) {
    totalCost = calculateEntryCost(model, {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_read_input_tokens: cacheReadTokens,
      cache_creation_input_tokens: cacheCreationTokens,
    });
  }

  const turnCount = userTurns + assistantTurns;
  result.turnCount = turnCount;
  result.cost = totalCost;
  result.model = model;
  result.inputTokens = inputTokens || undefined;
  result.outputTokens = outputTokens || undefined;
  result.cacheReadTokens = cacheReadTokens || undefined;
  result.cacheCreationTokens = cacheCreationTokens || undefined;

  // Write to cache
  cache[filePath] = {
    mtime: mtimeMs,
    turnCount,
    cost: totalCost,
    model,
    summary: result.summary || "",
    firstMessage: result.firstMessage || "",
    gitBranch: result.gitBranch,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    id: result.id,
  };
  usageCacheDirty = true;

  return result;
}

/**
 * List all sessions across all projects.
 */
export async function listAllSessions(options?: {
  limit?: number;
  afterDate?: Date;
}): Promise<SessionMetadata[]> {
  const sessions: SessionMetadata[] = [];
  const projectDirs = await listProjectDirs();
  const afterDate = options?.afterDate;
  const limit = options?.limit;

  const fileInfos: Array<{
    filePath: string;
    projectDir: string;
    mtime: Date;
  }> = [];

  for (const projectDir of projectDirs) {
    const sessionFiles = await listSessionFiles(projectDir);
    for (const sessionFile of sessionFiles) {
      const filePath = path.join(PROJECTS_DIR, projectDir, sessionFile);
      try {
        const stat = await fs.promises.stat(filePath);
        if (afterDate && stat.mtime < afterDate) continue;
        fileInfos.push({ filePath, projectDir, mtime: stat.mtime });
      } catch {
        // Skip
      }
    }
  }

  fileInfos.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  const filesToParse = limit ? fileInfos.slice(0, limit) : fileInfos;

  for (const { filePath, projectDir, mtime } of filesToParse) {
    try {
      const metadata = await parseSessionMetadataFast(filePath, mtime);
      const projectPath = await resolveProjectPath(projectDir);

      sessions.push({
        id: metadata.id || path.basename(filePath, ".jsonl"),
        filePath,
        projectPath,
        projectName: getProjectName(projectPath),
        summary: metadata.summary || "",
        firstMessage: metadata.firstMessage || "",
        lastModified: mtime,
        turnCount: metadata.turnCount || 0,
        cost: metadata.cost || 0,
        model: metadata.model,
        gitBranch: metadata.gitBranch,
        inputTokens: metadata.inputTokens,
        outputTokens: metadata.outputTokens,
        cacheReadTokens: metadata.cacheReadTokens,
        cacheCreationTokens: metadata.cacheCreationTokens,
      });
    } catch {
      // Skip
    }
  }

  // Flush cache after batch parsing
  await flushUsageCache();

  return sessions;
}

/**
 * Get full session details including all messages.
 */
export async function getSessionDetail(
  sessionId: string,
): Promise<SessionDetail | null> {
  const projectDirs = await listProjectDirs();

  for (const projectDir of projectDirs) {
    const sessionFiles = await listSessionFiles(projectDir);
    const matchingFile = sessionFiles.find(
      (f) => f === `${sessionId}.jsonl` || f.startsWith(sessionId),
    );

    if (matchingFile) {
      const filePath = path.join(PROJECTS_DIR, projectDir, matchingFile);
      return parseFullSession(filePath, projectDir);
    }
  }
  return null;
}

async function parseFullSession(
  filePath: string,
  encodedProjectPath: string,
): Promise<SessionDetail> {
  return new Promise((resolve, reject) => {
    const messages: SessionMessage[] = [];
    let summary = "";
    let id = path.basename(filePath, ".jsonl");
    let totalCost = 0;
    let model: string | undefined;
    let firstMessage = "";
    let gitBranch: string | undefined;
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let cacheCreationTokens = 0;

    const stream = fs.createReadStream(filePath, { encoding: "utf8" });
    const rl = readline.createInterface({ input: stream });

    rl.on("line", (line) => {
      if (!line.trim()) return;
      try {
        const entry: JSONLEntry = JSON.parse(line);

        if (entry.type === "summary") {
          summary = entry.summary || "";
          id = entry.leafUuid || id;
        }

        if (entry.type === "user" || entry.type === "human") {
          let content = "";
          if (typeof entry.message?.content === "string") {
            content = entry.message.content;
          } else if (Array.isArray(entry.message?.content)) {
            content = entry.message.content
              .filter((b) => b.type === "text")
              .map((b) => b.text)
              .join("\n");
          }
          if (!firstMessage) firstMessage = content.slice(0, 200);
          messages.push({
            type: "user",
            content,
            timestamp: entry.timestamp ? new Date(entry.timestamp) : undefined,
          });
        }

        if (entry.type === "assistant") {
          let content = "";
          let hasToolUse = false;
          if (typeof entry.message?.content === "string") {
            content = entry.message.content;
          } else if (Array.isArray(entry.message?.content)) {
            for (const block of entry.message.content) {
              if (block.type === "text") content += block.text || "";
              else if (block.type === "tool_use") hasToolUse = true;
            }
          }
          messages.push({
            type: "assistant",
            content,
            timestamp: entry.timestamp ? new Date(entry.timestamp) : undefined,
            toolUse: hasToolUse,
          });
        }

        if (entry.gitBranch) gitBranch = entry.gitBranch;
        if (entry.message?.model) model = entry.message.model;
        if (entry.message?.usage) {
          const u = entry.message.usage;
          if (u.input_tokens) inputTokens += u.input_tokens;
          if (u.output_tokens) outputTokens += u.output_tokens;
          if (u.cache_read_input_tokens)
            cacheReadTokens += u.cache_read_input_tokens;
          if (u.cache_creation_input_tokens)
            cacheCreationTokens += u.cache_creation_input_tokens;
          if (entry.message.model) {
            totalCost += calculateEntryCost(entry.message.model, u);
          }
        }
      } catch {
        // Skip
      }
    });

    rl.on("close", async () => {
      try {
        const stat = await fs.promises.stat(filePath);
        const projectPath = await resolveProjectPath(encodedProjectPath);
        resolve({
          id,
          filePath,
          projectPath,
          projectName: getProjectName(projectPath),
          summary,
          firstMessage,
          lastModified: stat.mtime,
          turnCount: messages.length,
          cost: totalCost,
          model,
          gitBranch,
          inputTokens: inputTokens || undefined,
          outputTokens: outputTokens || undefined,
          cacheReadTokens: cacheReadTokens || undefined,
          cacheCreationTokens: cacheCreationTokens || undefined,
          messages,
        });
      } catch (err) {
        reject(err);
      }
    });

    rl.on("error", reject);
    stream.on("error", reject);
  });
}
