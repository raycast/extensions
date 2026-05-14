import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";
import { trash } from "@raycast/api";

export type PermissionMode =
  | "acceptEdits"
  | "auto"
  | "bypassPermissions"
  | "default"
  | "dontAsk"
  | "plan";

export interface SessionMetadata {
  id: string;
  filePath: string;
  projectPath: string;
  projectName: string;
  summary: string;
  firstMessage: string;
  lastModified: Date;
  turnCount: number;
  cost: number;
  model?: string;
  matchSnippet?: string;
  permissionMode?: PermissionMode;
}

export interface SessionMessage {
  type: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
  toolUse?: boolean;
}

export interface SessionDetail extends SessionMetadata {
  messages: SessionMessage[];
  totalMessageCount: number;
}

interface JSONLEntry {
  type: string;
  summary?: string;
  leafUuid?: string;
  uuid?: string;
  // Used as part of the streaming-chunk dedup key.
  requestId?: string;
  message?: {
    // Other half of the streaming-chunk dedup key.
    id?: string;
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
  model?: string;
  timestamp?: string;
  permissionMode?: PermissionMode;
}

/**
 * Replace lone UTF-16 surrogates with U+FFFD (REPLACEMENT CHARACTER).
 * Session JSONL may contain lone surrogates that crash Raycast's
 * render tree serializer with "Cannot parse render tree JSON".
 */
function sanitizeString(str: string): string {
  return str.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    "\uFFFD",
  );
}

/**
 * Truncate a string without splitting UTF-16 surrogate pairs.
 * If the cut point lands on a high surrogate, backs off by one character.
 */
export function safeTruncate(str: string, maxLen: number, suffix = ""): string {
  if (str.length <= maxLen) return str;
  let end = maxLen;
  const code = str.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) {
    end--;
  }
  return str.slice(0, end) + suffix;
}

/**
 * Pull the plain text out of a JSONL message.content value, which can be
 * either a string or an array of typed blocks. Concatenates all text blocks
 * and ignores tool_use / tool_result / image / etc.
 */
function extractUserText(
  content: string | Array<{ type: string; text?: string }> | undefined,
): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("\n");
}

/**
 * Threshold (chars) below which a slash-command-style prompt is treated as
 * configuration (`/model`, `/effort high`, `/clear`) rather than the user's
 * real intent, and the caller should fall back to the next user message.
 */
const SHORT_SLASH_COMMAND_MAX_LEN = 30;

/**
 * Clean a raw user-message string for display as the session "prompt".
 *
 * Claude Code wraps certain user-side content with metadata tags that aren't
 * the user's actual prompt:
 *
 *  1. Any `<local-command-*>` block is injected when local commands run.
 *     Known variants: `<local-command-caveat>` (the boilerplate disclaimer),
 *     `<local-command-stdout>` (output echoed from /model, /effort, etc.).
 *     Pure metadata; never the user's prompt. Skip entirely.
 *  2. `<command-name>/X</command-name><command-message>X</command-message>
 *     <command-args>...</command-args>` wraps slash-command invocations. Tag
 *     order varies (some sessions lead with `<command-message>` instead of
 *     `<command-name>`). We extract `/name` and `<command-args>` content and
 *     render as "/cmd args".
 *
 * Additionally, short slash-command-only prompts (`/model`, `/effort high`,
 * `/clear`) are typically configuration commands rather than the user's real
 * intent, so we return null for those too. The caller should keep looking at
 * subsequent user messages.
 *
 * Returns the cleaned string, or null when the content should be skipped.
 */
export function cleanUserMessageContent(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Any local-command-* wrapper is metadata, not a user prompt.
  if (trimmed.startsWith("<local-command-")) return null;

  // The slash-command wrapper can lead with any of the three tags. Detect by
  // the common `<command-` prefix.
  if (trimmed.startsWith("<command-")) {
    const nameMatch = trimmed.match(/<command-name>([\s\S]*?)<\/command-name>/);
    const argsMatch = trimmed.match(/<command-args>([\s\S]*?)<\/command-args>/);
    const name = nameMatch?.[1]?.trim() || "";
    const args = argsMatch?.[1]?.trim() || "";
    const combined = args ? `${name} ${args}`.trim() : name;
    if (!combined) return null;
    return isShortSlashCommand(combined) ? null : combined;
  }

  return isShortSlashCommand(trimmed) ? null : trimmed;
}

function isShortSlashCommand(text: string): boolean {
  return text.startsWith("/") && text.length < SHORT_SLASH_COMMAND_MAX_LEN;
}

/**
 * Extract a short contextual snippet around the first occurrence of a query.
 * Normalizes whitespace so multiline session content produces clean subtitles.
 */
function extractSnippet(
  text: string,
  query: string,
  contextWords = 15,
): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return "";

  let start = idx;
  let wordsFound = 0;
  while (start > 0 && wordsFound < contextWords) {
    start--;
    if (normalized[start] === " ") wordsFound++;
  }
  if (start > 0) start++;

  let end = idx + query.length;
  wordsFound = 0;
  while (end < normalized.length && wordsFound < contextWords) {
    if (normalized[end] === " ") wordsFound++;
    end++;
  }

  const prefix = start > 0 ? "..." : "";
  const suffix = end < normalized.length ? "..." : "";

  // Build snippet with the matched portion wrapped in **bold** for highlighting
  const before = normalized.slice(start, idx);
  const match = normalized.slice(idx, idx + query.length);
  const after = normalized.slice(idx + query.length, end);
  const snippet =
    prefix + before + "**" + match + "**" + after.trimEnd() + suffix;
  return safeTruncate(snippet, 300);
}

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");

/**
 * Decode an encoded project path from Claude's directory naming.
 * WARNING: This is a lossy heuristic. Claude encodes both / and . as -,
 * so the result may be wrong. Prefer resolveProjectPath() which reads
 * sessions-index.json for the authoritative original path.
 */
export function decodeProjectPath(encodedPath: string): string {
  // Replace leading dash and all dashes with forward slashes
  return "/" + encodedPath.slice(1).replace(/-/g, "/");
}

// Cache resolved paths to avoid repeated fs reads
const resolvedPathCache = new Map<string, string>();

/**
 * Resolve an encoded project directory name to its original filesystem path.
 *
 * Resolution order:
 *   1. sessions-index.json (authoritative originalPath written by Claude Code)
 *   2. Filesystem-guided walk (uses os.homedir() as anchor, then probes the
 *      filesystem to disambiguate each "-" which could be /, ., or literal -)
 *   3. Naive decode (replaces every "-" with "/", known-lossy, last resort)
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
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
      console.warn(
        `Failed to read sessions-index.json for ${encodedDirName}:`,
        error,
      );
    }
  }

  // 2. Try filesystem-guided resolution
  const fsResolved = await resolveByFilesystemWalk(encodedDirName);
  if (fsResolved) {
    resolvedPathCache.set(encodedDirName, fsResolved);
    return fsResolved;
  }

  // 3. Naive decode (last resort, known-lossy, only cache if path exists)
  const decoded = decodeProjectPath(encodedDirName);
  try {
    await fs.promises.access(decoded);
    resolvedPathCache.set(encodedDirName, decoded);
  } catch {
    // Don't cache lossy results that don't exist on disk
  }
  return decoded;
}

/**
 * Attempt to reconstruct the original path by walking the filesystem.
 *
 * Uses os.homedir() to anchor the known prefix (resolving the username dot
 * ambiguity), then splits the remainder on "-" and greedily matches path
 * components against real directory entries, longest component first so
 * literal dashes in names (e.g. "helm-charts") are preferred over deeper
 * directory nesting.
 *
 * Handles dot-prefixed directories (e.g. ".claude") via the empty-segment
 * signal that results from splitting "--" on "-".
 */
async function resolveByFilesystemWalk(
  encodedDirName: string,
): Promise<string | null> {
  const homedir = os.homedir();
  const encodedHome = encodeProjectPath(homedir);

  if (!encodedDirName.startsWith(encodedHome)) {
    return null;
  }

  const remainder = encodedDirName.slice(encodedHome.length);
  if (!remainder) {
    return homedir;
  }

  // remainder starts with "-" (the / between homedir and rest)
  if (remainder[0] !== "-") return null;
  const rest = remainder.slice(1);
  if (!rest) return homedir;

  return walkPathSegments(homedir, rest.split("-"));
}

/**
 * Recursively resolve dash-separated parts into a real filesystem path.
 *
 * At each level, tries taking the longest possible run of parts as a single
 * path component (joined with literal "-"), checking if it exists on disk.
 * An empty part signals a dot-prefix (from Claude's encoding of "/." → "--").
 *
 * Claude Code encodes `_` as `-` in project directory names, so each candidate
 * component is also probed with all dashes replaced by underscores.
 */
async function walkPathSegments(
  basePath: string,
  parts: string[],
): Promise<string | null> {
  if (parts.length === 0) {
    return basePath;
  }

  // Try longest component first → prefer fewer directory levels
  for (let take = parts.length; take >= 1; take--) {
    const componentParts = parts.slice(0, take);
    const remaining = parts.slice(take);

    // Build the component name; a leading empty part means "." prefix
    // e.g. ["", "claude"] from "--claude" → ".claude"
    let component = componentParts.join("-");
    if (component.startsWith("-")) {
      component = "." + component.slice(1);
    } else if (component === "") {
      // Single empty part; skip (a bare "." by itself is not useful)
      continue;
    }

    // Claude Code also encodes underscores as dashes, so try both variants.
    // Original (with dashes) is tried first to prefer literal dash names.
    // Note: mixed dash/underscore names within a single component (e.g.
    // "helm-charts_v2") are not attempted; the encoding is inherently lossy
    // and trying all 2^n combinations per component is impractical. In
    // practice, the outer `take` loop handles this by splitting the encoded
    // string at different points, so "helm-charts" and "my_service" are
    // resolved as separate components rather than one mixed component.
    const variants = [component];
    if (component.includes("-")) {
      variants.push(component.replace(/-/g, "_"));
    }

    for (const variant of variants) {
      const candidatePath = path.join(basePath, variant);

      try {
        const stat = await fs.promises.stat(candidatePath);

        if (remaining.length === 0) {
          // Last component, any file type is fine
          return candidatePath;
        }

        if (stat.isDirectory()) {
          const resolved = await walkPathSegments(candidatePath, remaining);
          if (resolved) return resolved;
        }
      } catch (error: unknown) {
        const code = (error as NodeJS.ErrnoException)?.code;
        if (code !== "ENOENT" && code !== "ENOTDIR") {
          console.warn(`Unexpected error probing ${candidatePath}:`, error);
        }
      }
    }
  }

  return null;
}

/**
 * Encode a project path to Claude's directory naming format.
 * Claude Code replaces /, ., and _ with -.
 * Confirmed empirically by inspecting ~/.claude/projects/ directory names
 * against their corresponding originalPath values in sessions-index.json.
 */
export function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/[/._]/g, "-");
}

/**
 * Get the project name from a path
 */
export function getProjectName(projectPath: string): string {
  return path.basename(projectPath) || projectPath;
}

/**
 * List all project directories
 */
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

/**
 * List all session files for a project
 */
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

/**
 * Parse the first few lines of a JSONL session file to get metadata
 * Uses proper stream cleanup to prevent memory leaks
 */
async function parseSessionMetadataFast(
  filePath: string,
): Promise<Partial<SessionMetadata>> {
  return new Promise((resolve) => {
    const result: Partial<SessionMetadata> = {};
    let lineCount = 0;
    let turnCount = 0;
    let resolved = false;

    const safeResolve = () => {
      if (resolved) return;
      resolved = true;
      result.turnCount = turnCount;
      resolve(result);
    };

    const stream = fs.createReadStream(filePath, {
      encoding: "utf8",
      // Limit buffer size to reduce memory usage
      highWaterMark: 16 * 1024, // 16KB instead of default 64KB
    });
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    const cleanup = () => {
      rl.removeAllListeners();
      stream.removeAllListeners();
      rl.close();
      stream.destroy();
    };

    rl.on("line", (line) => {
      if (resolved) return;
      lineCount++;

      try {
        const entry: JSONLEntry = JSON.parse(line);

        if (entry.type === "summary") {
          result.summary = sanitizeString(entry.summary || "");
          result.id = entry.leafUuid || path.basename(filePath, ".jsonl");
        }

        if (entry.type === "user" || entry.type === "human") {
          turnCount++;
          if (!result.permissionMode && entry.permissionMode) {
            result.permissionMode = entry.permissionMode;
          }
          if (!result.firstMessage && entry.message?.content) {
            const raw = extractUserText(entry.message.content);
            const cleaned = cleanUserMessageContent(raw);
            if (cleaned) {
              result.firstMessage = sanitizeString(safeTruncate(cleaned, 200));
            }
          }
        }

        if (entry.type === "assistant") {
          turnCount++;
        }

        const entryModel = entry.message?.model || entry.model;
        if (entryModel) {
          result.model = entryModel;
        }
      } catch {
        // Skip unparseable lines silently to avoid memory accumulation from console.warn
      }

      // Read enough lines for metadata, then cleanup immediately
      if (lineCount >= 50) {
        cleanup();
        safeResolve();
      }
    });

    rl.on("close", () => {
      safeResolve();
    });

    rl.on("error", () => {
      cleanup();
      safeResolve();
    });

    stream.on("error", () => {
      cleanup();
      safeResolve();
    });
  });
}

export interface SessionDetailOptions {
  /** Maximum number of messages to retain in the returned array. Default 200. */
  maxMessages?: number;
  /** Maximum characters per message content. Default 5000. */
  maxContentChars?: number;
}

const DEFAULT_DETAIL_MAX_MESSAGES = 200;
const DEFAULT_DETAIL_MAX_CONTENT_CHARS = 5000;

/**
 * Get full session details including all messages.
 * Caps the returned messages array (defaults: last 200 messages, 5KB per message)
 * so React state can hold any session without OOM. The original count is exposed
 * via SessionDetail.totalMessageCount.
 */
export async function getSessionDetail(
  sessionId: string,
  options?: SessionDetailOptions,
): Promise<SessionDetail | null> {
  const projectDirs = await listProjectDirs();

  for (const projectDir of projectDirs) {
    const sessionFiles = await listSessionFiles(projectDir);
    const matchingFile = sessionFiles.find(
      (f) => f === `${sessionId}.jsonl` || f.includes(sessionId),
    );

    if (matchingFile) {
      const filePath = path.join(PROJECTS_DIR, projectDir, matchingFile);
      return parseFullSession(filePath, projectDir, options);
    }
  }

  return null;
}

/**
 * Parse a full session file using streaming to handle large files.
 * Caps per-message content during parsing and slices the final array to the
 * last N messages so memory stays bounded for huge sessions.
 */
async function parseFullSession(
  filePath: string,
  encodedProjectPath: string,
  options?: SessionDetailOptions,
): Promise<SessionDetail> {
  const maxMessages = options?.maxMessages ?? DEFAULT_DETAIL_MAX_MESSAGES;
  const maxContentChars =
    options?.maxContentChars ?? DEFAULT_DETAIL_MAX_CONTENT_CHARS;

  return new Promise((resolve, reject) => {
    const messages: SessionMessage[] = [];
    let summary = "";
    let id = path.basename(filePath, ".jsonl");
    let model: string | undefined;
    let firstMessage = "";

    const stream = fs.createReadStream(filePath, { encoding: "utf8" });
    const rl = readline.createInterface({ input: stream });

    rl.on("line", (line) => {
      if (!line.trim()) return;

      try {
        const entry: JSONLEntry = JSON.parse(line);

        if (entry.type === "summary") {
          summary = sanitizeString(entry.summary || "");
          id = entry.leafUuid || id;
        }

        if (entry.type === "user" || entry.type === "human") {
          const raw = extractUserText(entry.message?.content);
          const content = sanitizeString(raw);

          if (!firstMessage) {
            const cleaned = cleanUserMessageContent(content);
            if (cleaned) {
              firstMessage = safeTruncate(cleaned, 200);
            }
          }

          messages.push({
            type: "user",
            content: safeTruncate(content, maxContentChars, "…"),
            timestamp: entry.timestamp ? new Date(entry.timestamp) : undefined,
          });
        }

        if (entry.type === "assistant") {
          let content = "";
          let hasToolUse = false;

          if (typeof entry.message?.content === "string") {
            content = sanitizeString(entry.message.content);
          } else if (Array.isArray(entry.message?.content)) {
            for (const block of entry.message.content) {
              if (block.type === "text") {
                content += block.text || "";
              } else if (block.type === "tool_use") {
                hasToolUse = true;
              }
            }
            content = sanitizeString(content);
          }

          messages.push({
            type: "assistant",
            content: safeTruncate(content, maxContentChars, "…"),
            timestamp: entry.timestamp ? new Date(entry.timestamp) : undefined,
            toolUse: hasToolUse,
          });
        }

        const entryModel = entry.message?.model || entry.model;
        if (entryModel) {
          model = entryModel;
        }
      } catch {
        // Skip unparseable lines silently to avoid memory accumulation
      }
    });

    rl.on("close", async () => {
      try {
        const stat = await fs.promises.stat(filePath);
        const projectPath = await resolveProjectPath(encodedProjectPath);

        const totalMessageCount = messages.length;
        const trimmedMessages =
          totalMessageCount > maxMessages
            ? messages.slice(totalMessageCount - maxMessages)
            : messages;

        resolve({
          id,
          filePath,
          projectPath,
          projectName: getProjectName(projectPath),
          summary,
          firstMessage,
          lastModified: stat.mtime,
          turnCount: totalMessageCount,
          cost: 0,
          model,
          messages: trimmedMessages,
          totalMessageCount,
        });
      } catch (err) {
        reject(err);
      }
    });

    rl.on("error", reject);
    stream.on("error", reject);
  });
}

interface SessionFileInfo {
  filePath: string;
  projectDir: string;
  mtime: Date;
}

/**
 * Collect session files newest-first, bounded by `limit` when provided.
 *
 * When a limit is set, maintains a sorted array of size ≤ limit so we never
 * stat more files than necessary to know the newest N. Each new file replaces
 * the oldest entry only if it's strictly newer, avoiding O(N) work per
 * insertion while still giving exact newest-N results.
 *
 * Without a limit, falls back to a flat collection + final sort (legacy
 * behavior, used by getAllTimeStats).
 */
async function collectSessionFiles(
  projectDirs: string[],
  limit: number | undefined,
  afterDate: Date | undefined,
): Promise<SessionFileInfo[]> {
  if (!limit) {
    const all: SessionFileInfo[] = [];
    for (const projectDir of projectDirs) {
      const sessionFiles = await listSessionFiles(projectDir);
      for (const sessionFile of sessionFiles) {
        const filePath = path.join(PROJECTS_DIR, projectDir, sessionFile);
        try {
          const stat = await fs.promises.stat(filePath);
          if (afterDate && stat.mtime < afterDate) continue;
          all.push({ filePath, projectDir, mtime: stat.mtime });
        } catch {
          /* ignore unreadable */
        }
      }
    }
    all.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    return all;
  }

  // Bounded path: keep top-N newest with insertion-sorted array.
  const top: SessionFileInfo[] = [];
  for (const projectDir of projectDirs) {
    const sessionFiles = await listSessionFiles(projectDir);
    for (const sessionFile of sessionFiles) {
      const filePath = path.join(PROJECTS_DIR, projectDir, sessionFile);
      try {
        const stat = await fs.promises.stat(filePath);
        if (afterDate && stat.mtime < afterDate) continue;
        if (top.length < limit) {
          top.push({ filePath, projectDir, mtime: stat.mtime });
          // Keep newest-first
          top.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
        } else if (stat.mtime > top[top.length - 1].mtime) {
          top[top.length - 1] = { filePath, projectDir, mtime: stat.mtime };
          top.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
        }
      } catch {
        /* ignore unreadable */
      }
    }
  }
  return top;
}

/**
 * List all sessions across all projects
 * @param options.limit - Maximum number of sessions to return (for memory optimization)
 * @param options.afterDate - Only include sessions modified after this date
 */
export async function listAllSessions(options?: {
  limit?: number;
  afterDate?: Date;
}): Promise<SessionMetadata[]> {
  const sessions: SessionMetadata[] = [];
  const projectDirs = await listProjectDirs();

  const filesToParse = await collectSessionFiles(
    projectDirs,
    options?.limit,
    options?.afterDate,
  );

  // Memo project resolution per call so each unique projectDir is resolved once.
  const projectPathMemo = new Map<string, string>();
  const resolveProjectPathOnce = async (
    projectDir: string,
  ): Promise<string> => {
    const cached = projectPathMemo.get(projectDir);
    if (cached !== undefined) return cached;
    const resolved = await resolveProjectPath(projectDir);
    projectPathMemo.set(projectDir, resolved);
    return resolved;
  };

  for (const { filePath, projectDir, mtime } of filesToParse) {
    try {
      const metadata = await parseSessionMetadataFast(filePath);
      const projectPath = await resolveProjectPathOnce(projectDir);

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
        permissionMode: metadata.permissionMode,
      });
    } catch {
      // Skip files we can't read
    }
  }

  return sessions;
}

/**
 * List sessions for a specific project
 */
export async function listProjectSessions(
  projectPath: string,
): Promise<SessionMetadata[]> {
  const encodedPath = encodeProjectPath(projectPath);
  const projectDir = path.join(PROJECTS_DIR, encodedPath);

  // Only parse sessions from the specific project directory instead of loading all
  const sessions: SessionMetadata[] = [];
  try {
    const sessionFiles = await listSessionFiles(encodedPath);
    for (const sessionFile of sessionFiles) {
      const filePath = path.join(projectDir, sessionFile);
      try {
        const stat = await fs.promises.stat(filePath);
        const metadata = await parseSessionMetadataFast(filePath);
        const resolvedPath = await resolveProjectPath(encodedPath);
        sessions.push({
          id: metadata.id || path.basename(filePath, ".jsonl"),
          filePath,
          projectPath: resolvedPath,
          projectName: getProjectName(resolvedPath),
          summary: metadata.summary || "",
          firstMessage: metadata.firstMessage || "",
          lastModified: stat.mtime,
          turnCount: metadata.turnCount || 0,
          cost: metadata.cost || 0,
          model: metadata.model,
          permissionMode: metadata.permissionMode,
        });
      } catch {
        // Skip files we can't read
      }
    }
  } catch {
    // Project directory doesn't exist
  }

  return sessions.sort(
    (a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
  );
}

/**
 * Get the most recent session
 * Optimized to only load one session
 */
export async function getMostRecentSession(): Promise<SessionMetadata | null> {
  const sessions = await listAllSessions({ limit: 1 });
  return sessions[0] || null;
}

/**
 * Search all session files for content matching a query string.
 * Streams through each JSONL file line-by-line and short-circuits on
 * first match per session. Supports cancellation via AbortSignal.
 *
 * @param query - Case-insensitive search string
 * @param onMatch - Called incrementally as matching sessions are found
 * @param signal - AbortSignal to cancel in-flight search
 */
export async function searchSessionContent(
  query: string,
  onMatch: (session: SessionMetadata) => void,
  signal?: AbortSignal,
): Promise<void> {
  const lowerQuery = query.toLowerCase();
  const projectDirs = await listProjectDirs();
  if (signal?.aborted) return;

  // Collect all session files with metadata for sorting
  const fileInfos: Array<{
    filePath: string;
    projectDir: string;
    mtime: Date;
  }> = [];

  for (const projectDir of projectDirs) {
    if (signal?.aborted) return;
    const sessionFiles = await listSessionFiles(projectDir);
    for (const sessionFile of sessionFiles) {
      const filePath = path.join(PROJECTS_DIR, projectDir, sessionFile);
      try {
        const stat = await fs.promises.stat(filePath);
        fileInfos.push({ filePath, projectDir, mtime: stat.mtime });
      } catch (error: unknown) {
        const code = (error as NodeJS.ErrnoException)?.code;
        if (code !== "ENOENT") {
          console.warn(`Failed to stat session file ${filePath}:`, error);
        }
      }
    }
  }

  // Search most recent sessions first
  fileInfos.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  for (const { filePath, projectDir, mtime } of fileInfos) {
    if (signal?.aborted) return;

    const match = await searchSingleSession(filePath, lowerQuery, signal);
    if (match) {
      const projectPath = await resolveProjectPath(projectDir);
      onMatch({
        id: match.id || path.basename(filePath, ".jsonl"),
        filePath,
        projectPath,
        projectName: getProjectName(projectPath),
        summary: match.summary || "",
        firstMessage: match.firstMessage || "",
        lastModified: mtime,
        turnCount: match.turnCount,
        cost: match.cost,
        model: match.model,
        matchSnippet: match.matchSnippet,
        permissionMode: match.permissionMode,
      });
    }
  }
}

/**
 * Search a single session file for a query match.
 * Reads the entire file to collect full metadata (turnCount, cost, model).
 * Sets a match flag on first content hit, skipping redundant string
 * comparisons for subsequent lines.
 */
async function searchSingleSession(
  filePath: string,
  lowerQuery: string,
  signal?: AbortSignal,
): Promise<{
  id: string;
  summary: string;
  firstMessage: string;
  turnCount: number;
  cost: number;
  model?: string;
  matchSnippet?: string;
  permissionMode?: PermissionMode;
} | null> {
  type MatchResult = {
    id: string;
    summary: string;
    firstMessage: string;
    turnCount: number;
    cost: number;
    model?: string;
    matchSnippet?: string;
    permissionMode?: PermissionMode;
  };

  return new Promise<MatchResult | null>((resolve) => {
    let found = false;
    let matchSnippet = "";
    let summary = "";
    let id = path.basename(filePath, ".jsonl");
    let firstMessage = "";
    let turnCount = 0;
    let model: string | undefined;
    let permissionMode: PermissionMode | undefined;
    let resolved = false;

    const safeResolve = (value: MatchResult | null) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    const stream = fs.createReadStream(filePath, {
      encoding: "utf8",
      highWaterMark: 16 * 1024,
    });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    const cleanup = () => {
      rl.removeAllListeners();
      stream.removeAllListeners();
      rl.close();
      stream.destroy();
    };

    // Abort if signal fires
    const onAbort = () => {
      cleanup();
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    rl.on("line", (line) => {
      if (resolved) return;
      if (signal?.aborted) {
        cleanup();
        safeResolve(null);
        return;
      }

      try {
        const entry: JSONLEntry = JSON.parse(line);

        if (entry.type === "summary") {
          summary = sanitizeString(entry.summary || "");
          id = entry.leafUuid || id;
        }

        // Extract message content
        let content = "";
        if (entry.message?.content) {
          if (typeof entry.message.content === "string") {
            content = sanitizeString(entry.message.content);
          } else if (Array.isArray(entry.message.content)) {
            content = sanitizeString(
              entry.message.content
                .filter((b) => b.type === "text")
                .map((b) => b.text || "")
                .join(" "),
            );
          }
        }

        if (entry.type === "user" || entry.type === "human") {
          turnCount++;
          if (!permissionMode && entry.permissionMode) {
            permissionMode = entry.permissionMode;
          }
          if (!firstMessage && content) {
            const cleaned = cleanUserMessageContent(content);
            if (cleaned) {
              firstMessage = safeTruncate(cleaned, 200);
            }
          }
        }

        if (entry.type === "assistant") {
          turnCount++;
        }

        const entryModel = entry.message?.model || entry.model;
        if (entryModel) model = entryModel;

        // Check for match in content and summary, capture snippet on first hit
        if (!found) {
          const matchSource =
            content && content.toLowerCase().includes(lowerQuery)
              ? content
              : summary && summary.toLowerCase().includes(lowerQuery)
                ? summary
                : null;
          if (matchSource) {
            found = true;
            matchSnippet = extractSnippet(matchSource, lowerQuery);
          }
        }
      } catch {
        // Skip unparseable lines
      }
    });

    rl.on("close", () => {
      signal?.removeEventListener("abort", onAbort);
      safeResolve(
        found
          ? {
              id,
              summary,
              firstMessage,
              turnCount,
              cost: 0,
              model,
              matchSnippet,
              permissionMode,
            }
          : null,
      );
    });

    rl.on("error", (err) => {
      console.warn(`Error reading session ${filePath}:`, err.message);
      cleanup();
      signal?.removeEventListener("abort", onAbort);
      safeResolve(null);
    });
    stream.on("error", (err) => {
      console.warn(`Stream error for ${filePath}:`, err.message);
      cleanup();
      signal?.removeEventListener("abort", onAbort);
      safeResolve(null);
    });
  });
}

export interface SessionUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  model?: string;
}

/** Per-message tokens, used for tier-aware cost calculation per request. */
export interface MessageUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  model?: string;
  /** ISO timestamp from the entry; used for per-day bucketing in dailyByDate. */
  timestamp?: string;
}

export interface SessionUsageDetailed extends SessionUsage {
  /** Per-message usage, deduplicated across streaming chunks. */
  messages: MessageUsage[];
  /**
   * Optional per-day bucketing keyed by YYYY-MM-DD. Populated only when the
   * caller passes `bucketByDay: true`. Costs/tokens stay scoped to the day
   * each message's timestamp falls into. Fixes attribution that previously
   * stamped all of a session's cost on its file mtime.
   */
  dailyByDate?: Map<string, MessageUsage[]>;
}

/**
 * Streaming usage scanner. Reads the JSONL file and sums tokens.
 *
 * Anthropic's Messages API emits cumulative `usage` in each streaming chunk
 * (running totals, not deltas). The CLI persists one JSONL line per chunk, so
 * naive summing multiplies by chunk count. We dedup by (message.id + requestId)
 * and keep the last (largest) value per key, then sum across keys. Lines
 * without both IDs (older logs) tally directly.
 *
 * Stream listeners get explicit cleanup to keep V8 GC pressure low under
 * back-to-back invocations.
 */
export async function streamSessionUsage(
  filePath: string,
  afterDate?: Date,
  options?: { bucketByDay?: boolean },
): Promise<SessionUsageDetailed> {
  return new Promise((resolve) => {
    let model: string | undefined;
    // Streaming chunks share message.id + requestId. Keep the last (cumulative
    // final) per key. Lines lacking both IDs (older logs) tally separately.
    const seenChunks = new Map<string, MessageUsage>();
    const unkeyed: MessageUsage[] = [];
    let resolved = false;

    const stream = fs.createReadStream(filePath, {
      encoding: "utf8",
      highWaterMark: 16 * 1024,
    });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    const cleanup = () => {
      rl.removeAllListeners();
      stream.removeAllListeners();
      rl.close();
      stream.destroy();
    };

    const safeResolve = () => {
      if (resolved) return;
      resolved = true;
      cleanup();

      const messages: MessageUsage[] = [...seenChunks.values(), ...unkeyed];

      let inputTokens = 0;
      let outputTokens = 0;
      let cacheReadTokens = 0;
      let cacheCreationTokens = 0;
      for (const m of messages) {
        inputTokens += m.inputTokens;
        outputTokens += m.outputTokens;
        cacheReadTokens += m.cacheReadTokens;
        cacheCreationTokens += m.cacheCreationTokens;
      }

      let dailyByDate: Map<string, MessageUsage[]> | undefined;
      if (options?.bucketByDay) {
        dailyByDate = new Map();
        for (const m of messages) {
          if (!m.timestamp) continue;
          const dateStr = m.timestamp.slice(0, 10);
          let bucket = dailyByDate.get(dateStr);
          if (!bucket) {
            bucket = [];
            dailyByDate.set(dateStr, bucket);
          }
          bucket.push(m);
        }
      }

      resolve({
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheCreationTokens,
        model,
        messages,
        dailyByDate,
      });
    };

    rl.on("line", (line) => {
      if (resolved) return;
      try {
        const entry: JSONLEntry = JSON.parse(line);
        if (!entry.message?.usage) return;
        if (afterDate) {
          // Skip entries older than the cutoff. Entries lacking a timestamp
          // (older JSONL formats) are also skipped: without a timestamp we
          // can't verify they fall inside the requested range, so counting
          // them would inflate today/week/month totals.
          if (!entry.timestamp || new Date(entry.timestamp) < afterDate) {
            return;
          }
        }

        const usage = entry.message.usage;
        const msg: MessageUsage = {
          inputTokens: usage.input_tokens || 0,
          outputTokens: usage.output_tokens || 0,
          cacheReadTokens: usage.cache_read_input_tokens || 0,
          cacheCreationTokens: usage.cache_creation_input_tokens || 0,
          model: entry.message?.model || entry.model,
          timestamp: entry.timestamp,
        };

        const msgId = entry.message?.id;
        const reqId = entry.requestId;
        if (msgId && reqId) {
          // Last write wins → preserves the final cumulative value.
          seenChunks.set(`${msgId}:${reqId}`, msg);
        } else {
          unkeyed.push(msg);
        }

        const m = msg.model;
        if (m) model = m;
      } catch {
        // skip unparseable
      }
    });

    rl.on("close", safeResolve);
    rl.on("error", safeResolve);
    stream.on("error", safeResolve);
  });
}

/**
 * Delete a session file
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  const session = await getSessionDetail(sessionId);
  if (!session) return false;

  try {
    await trash(session.filePath);
    return true;
  } catch {
    return false;
  }
}
