import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";
import { environment, getPreferenceValues, trash } from "@raycast/api";
import {
  decodeClaudeProjectPathLossy,
  encodeClaudeProjectPath,
  extractClaudeSessionCwd,
  getClaudeConfigDirectory,
  isWindows,
  matchesClaudeProjectDirectory,
  validateClaudeSessionCwd,
} from "./platform";
import { getLocalDateKey, parseValidDate } from "./date";
import { reconcileCacheCreation } from "./pricing";
import {
  searchSessionIndex,
  updateSessionSearchIndex,
  readSessionMatchContext,
  type SearchIndexMatch,
  type SearchIndexSource,
  type SearchIndexStatus,
} from "./session-search-index";
import {
  getDefaultSessionInboxLocations,
  loadSupplementalSessionMetadata,
  mergeSessionInboxMetadata,
  type SupplementalSessionMetadata,
  type SessionSourceDescriptor,
} from "./session-inbox";
import { discoverWslClaudeStores, type WslClaudeStore } from "./wsl-runtime";
import { wslLinuxPathToUnc } from "./wsl-core";
import {
  isMissingPathError,
  shouldStopMetadataScan,
} from "./session-parser-core";

export type PermissionMode =
  | "acceptEdits"
  | "auto"
  | "bypassPermissions"
  | "default"
  | "dontAsk"
  | "plan";

export interface SessionMetadata {
  identity?: string;
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
  mentionedFiles?: string[];
  match?: SearchIndexMatch;
  title?: string;
  entrypoint?: string;
  gitBranch?: string;
  workspacePath?: string;
  archived?: boolean;
  sources?: SessionSourceDescriptor[];
  desktopLocalSessionId?: string;
  desktopBridgeId?: string;
  conductorWorkspaceId?: string;
}

export interface SessionMessage {
  type: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
  toolUse?: boolean;
  stableMessageId?: string;
  messageIndex?: number;
  matched?: boolean;
  referencedFiles?: string[];
  imagePaths?: string[];
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
  cwd?: string;
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
      cache_creation?: {
        ephemeral_5m_input_tokens?: number;
        ephemeral_1h_input_tokens?: number;
      };
    };
  };
  model?: string;
  timestamp?: string;
  permissionMode?: PermissionMode;
  customTitle?: string;
  entrypoint?: string;
  gitBranch?: string;
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
const preferences = getPreferenceValues<Preferences>();
const CLAUDE_DIR = getClaudeConfigDirectory(
  os.homedir(),
  process.env,
  preferences.claudeConfigPath,
);
const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");
const SESSION_INBOX_CACHE_MS = 60_000;
let sessionInboxCache:
  | { expiresAt: number; metadata: SupplementalSessionMetadata }
  | undefined;

export function getClaudeProjectsDirectory(): string {
  return PROJECTS_DIR;
}

async function getSupplementalSessionMetadata(
  signal?: AbortSignal,
): Promise<SupplementalSessionMetadata> {
  if (sessionInboxCache && sessionInboxCache.expiresAt > Date.now()) {
    return sessionInboxCache.metadata;
  }
  const metadata = await loadSupplementalSessionMetadata({
    ...getDefaultSessionInboxLocations(),
    signal,
  });
  sessionInboxCache = {
    expiresAt: Date.now() + SESSION_INBOX_CACHE_MS,
    metadata,
  };
  return metadata;
}

/**
 * Decode an encoded project path from Claude's directory naming.
 * WARNING: This is a lossy heuristic. Claude encodes both / and . as -,
 * so the result may be wrong. Prefer resolveProjectPath() which reads
 * sessions-index.json for the authoritative original path.
 */
export function decodeProjectPath(encodedPath: string): string {
  return decodeClaudeProjectPathLossy(encodedPath);
}

const RESOLVED_PATH_CACHE_TTL_MS = 5 * 60_000;
const resolvedPathCache = new Map<
  string,
  { value: string; expiresAt: number }
>();

function getCachedResolvedPath(encodedDirName: string): string | undefined {
  const cached = resolvedPathCache.get(encodedDirName);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    resolvedPathCache.delete(encodedDirName);
    return undefined;
  }
  return cached.value;
}

function cacheResolvedPath(encodedDirName: string, value: string): void {
  resolvedPathCache.set(encodedDirName, {
    value,
    expiresAt: Date.now() + RESOLVED_PATH_CACHE_TTL_MS,
  });
}

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
  const cached = getCachedResolvedPath(encodedDirName);
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
    if (
      index.originalPath &&
      typeof index.originalPath === "string" &&
      isValidEncodedProjectPath(index.originalPath, encodedDirName)
    ) {
      cacheResolvedPath(encodedDirName, index.originalPath);
      return index.originalPath;
    }
  } catch (error: unknown) {
    if (!isMissingPathError(error)) throw error;
  }

  // 2. Read cwd from a bounded prefix of a session transcript. This is the
  // most reliable fallback on Windows, where the encoded drive and separators
  // cannot be reconstructed without ambiguity.
  const sessionCwd = await resolveFromSessionCwd(encodedDirName);
  if (sessionCwd) {
    cacheResolvedPath(encodedDirName, sessionCwd);
    return sessionCwd;
  }

  // 3. Try filesystem-guided resolution
  const fsResolved = await resolveByFilesystemWalk(encodedDirName);
  if (fsResolved) {
    cacheResolvedPath(encodedDirName, fsResolved);
    return fsResolved;
  }

  // 4. Naive decode (last resort, known-lossy, only cache if path exists)
  const decoded = decodeProjectPath(encodedDirName);
  try {
    await fs.promises.access(decoded);
    cacheResolvedPath(encodedDirName, decoded);
  } catch (error: unknown) {
    if (!isMissingPathError(error)) throw error;
  }
  return decoded;
}

function isValidEncodedProjectPath(
  projectPath: string,
  encodedDirName: string,
): boolean {
  if (!path.isAbsolute(projectPath)) return false;
  return matchesClaudeProjectDirectory(projectPath, encodedDirName);
}

async function resolveFromSessionCwd(
  encodedDirName: string,
): Promise<string | null> {
  const projectDir = path.join(PROJECTS_DIR, encodedDirName);
  let sessionFiles: string[];
  try {
    sessionFiles = (await fs.promises.readdir(projectDir))
      .filter((name) => name.endsWith(".jsonl"))
      .slice(0, 10);
  } catch (error: unknown) {
    if (isMissingPathError(error)) return null;
    throw error;
  }

  for (const sessionFile of sessionFiles) {
    try {
      const cwd = await readSessionCwdFromFile(
        path.join(projectDir, sessionFile),
        encodedDirName,
      );
      if (cwd) return cwd;
    } catch (error: unknown) {
      if (!isMissingPathError(error)) throw error;
    }
  }
  return null;
}

async function readSessionCwdFromFile(
  filePath: string,
  encodedDirName: string,
): Promise<string | null> {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const buffer = new Uint8Array(64 * 1024);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const head = Buffer.from(buffer.subarray(0, bytesRead)).toString("utf8");
    return extractClaudeSessionCwd(head, encodedDirName);
  } finally {
    await handle.close();
  }
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
        if (!isMissingPathError(error)) throw error;
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
  return encodeClaudeProjectPath(projectPath);
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
  } catch (error: unknown) {
    if (isMissingPathError(error)) return [];
    throw error;
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
  } catch (error: unknown) {
    if (isMissingPathError(error)) return [];
    throw error;
  }
}

/**
 * Parse the first few lines of a JSONL session file to get metadata
 * Uses proper stream cleanup to prevent memory leaks
 */
async function parseSessionMetadataFast(
  filePath: string,
): Promise<Partial<SessionMetadata>> {
  return new Promise((resolve, reject) => {
    const result: Partial<SessionMetadata> = {};
    let lineCount = 0;
    let turnCount = 0;
    let resolved = false;
    let sawUserEntry = false;

    const safeResolve = () => {
      if (resolved) return;
      resolved = true;
      result.turnCount = turnCount;
      resolve(result);
    };

    const safeReject = (error: unknown) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      reject(error);
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

        if (!result.projectPath) {
          const sessionCwd = validateClaudeSessionCwd(
            entry.cwd,
            path.basename(path.dirname(filePath)),
          );
          if (sessionCwd) result.projectPath = sanitizeString(sessionCwd);
        }

        if (entry.type === "user" || entry.type === "human") {
          sawUserEntry = true;
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
        if (entry.customTitle?.trim()) {
          result.title = sanitizeString(
            safeTruncate(entry.customTitle.trim(), 500),
          );
        }
        if (entry.entrypoint?.trim()) {
          result.entrypoint = sanitizeString(
            safeTruncate(entry.entrypoint.trim(), 100),
          );
        }
        if (entry.gitBranch?.trim()) {
          result.gitBranch = sanitizeString(
            safeTruncate(entry.gitBranch.trim(), 500),
          );
        }
      } catch {
        // Skip unparseable lines silently to avoid memory accumulation from console.warn
      }

      // Read enough lines for metadata, then cleanup immediately
      if (shouldStopMetadataScan(lineCount, sawUserEntry)) {
        cleanup();
        safeResolve();
      }
    });

    rl.on("close", () => {
      safeResolve();
    });

    rl.on("error", safeReject);
    stream.on("error", safeReject);
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

export async function getSessionDetailAtMatch(
  session: SessionMetadata,
  options?: {
    before?: number;
    after?: number;
    maxContentChars?: number;
    signal?: AbortSignal;
  },
): Promise<SessionDetail | null> {
  if (!session.match) return getSessionDetailForSession(session);
  const context = await readSessionMatchContext(
    session.filePath,
    session.match,
    {
      allowedRoots: [
        PROJECTS_DIR,
        path.dirname(session.filePath),
        session.projectPath,
      ],
      projectPath: session.projectPath,
      before: options?.before,
      after: options?.after,
      maxContentChars: options?.maxContentChars,
      signal: options?.signal,
    },
  );
  return {
    ...session,
    messages: context.messages.map((message) => ({
      type: message.type === "summary" ? "system" : message.type,
      content: message.content,
      stableMessageId: message.stableMessageId,
      messageIndex: message.messageIndex,
      matched: message.matched,
      referencedFiles: message.referencedFiles,
      imagePaths: message.imagePaths,
    })),
    totalMessageCount: context.totalMessageCount,
    mentionedFiles: context.referencedFiles,
  };
}

export async function getSessionDetailForSession(
  session: SessionMetadata,
  options?: SessionDetailOptions,
): Promise<SessionDetail | null> {
  const encodedProjectPath = path.basename(path.dirname(session.filePath));
  const detail = await parseFullSession(
    session.filePath,
    encodedProjectPath,
    options,
    session.projectPath,
  );
  return { ...session, ...detail, sources: session.sources };
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
  resolvedProjectPath?: string,
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
    let sessionProjectPath: string | undefined;

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

        if (!sessionProjectPath) {
          const sessionCwd = validateClaudeSessionCwd(
            entry.cwd,
            encodedProjectPath,
          );
          if (sessionCwd) sessionProjectPath = sanitizeString(sessionCwd);
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
        const projectPath =
          resolvedProjectPath ??
          sessionProjectPath ??
          (await resolveProjectPath(encodedProjectPath));

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
  wsl?: {
    store: WslClaudeStore;
    linuxProjectPath: string;
    windowsProjectPath: string;
  };
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
        } catch (error: unknown) {
          if (!isMissingPathError(error)) throw error;
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
      } catch (error: unknown) {
        if (!isMissingPathError(error)) throw error;
      }
    }
  }
  return top;
}

async function collectWslSessionFiles(
  limit: number | undefined,
  afterDate: Date | undefined,
): Promise<SessionFileInfo[]> {
  if (!isWindows()) return [];
  let stores: WslClaudeStore[];
  try {
    stores = await discoverWslClaudeStores();
  } catch {
    return [];
  }
  const files: SessionFileInfo[] = [];
  for (const store of stores) {
    let projectDirectories: fs.Dirent[];
    try {
      projectDirectories = await fs.promises.readdir(
        store.windowsProjectsDirectory,
        { withFileTypes: true },
      );
    } catch {
      continue;
    }
    for (const projectEntry of projectDirectories) {
      if (!projectEntry.isDirectory()) continue;
      const sourceProjectDirectory = path.win32.join(
        store.windowsProjectsDirectory,
        projectEntry.name,
      );
      let sessionFiles: string[];
      try {
        sessionFiles = (
          await fs.promises.readdir(sourceProjectDirectory)
        ).filter((fileName) => fileName.endsWith(".jsonl"));
      } catch {
        continue;
      }
      const linuxProjectPath = await resolveWslProjectPath(
        store,
        projectEntry.name,
        sessionFiles.map((fileName) =>
          path.win32.join(sourceProjectDirectory, fileName),
        ),
      );
      const windowsProjectPath = wslPathForStore(store, linuxProjectPath);
      for (const sessionFile of sessionFiles) {
        const filePath = path.win32.join(sourceProjectDirectory, sessionFile);
        try {
          const stat = await fs.promises.stat(filePath);
          if (!stat.isFile() || (afterDate && stat.mtime < afterDate)) continue;
          const info: SessionFileInfo = {
            filePath,
            projectDir: projectEntry.name,
            mtime: stat.mtime,
            wsl: { store, linuxProjectPath, windowsProjectPath },
          };
          if (!limit) {
            files.push(info);
          } else if (files.length < limit) {
            files.push(info);
            files.sort(
              (left, right) => right.mtime.getTime() - left.mtime.getTime(),
            );
          } else if (info.mtime > files[files.length - 1].mtime) {
            files[files.length - 1] = info;
            files.sort(
              (left, right) => right.mtime.getTime() - left.mtime.getTime(),
            );
          }
        } catch {
          continue;
        }
      }
    }
  }
  return files.sort(
    (left, right) => right.mtime.getTime() - left.mtime.getTime(),
  );
}

async function resolveWslProjectPath(
  store: WslClaudeStore,
  encodedProjectDirectory: string,
  sessionFiles: string[],
): Promise<string> {
  const indexPath = path.win32.join(
    store.windowsProjectsDirectory,
    encodedProjectDirectory,
    "sessions-index.json",
  );
  try {
    const stat = await fs.promises.stat(indexPath);
    if (stat.isFile() && stat.size <= 4 * 1024 * 1024) {
      const value: unknown = JSON.parse(
        await fs.promises.readFile(indexPath, "utf8"),
      );
      if (
        typeof value === "object" &&
        value !== null &&
        "originalPath" in value &&
        typeof value.originalPath === "string" &&
        path.posix.isAbsolute(value.originalPath) &&
        matchesClaudeProjectDirectory(
          value.originalPath,
          encodedProjectDirectory,
          "linux",
        )
      ) {
        return path.posix.normalize(value.originalPath);
      }
    }
  } catch {
    // Fall back to a bounded transcript prefix.
  }
  for (const sessionFile of sessionFiles.slice(0, 10)) {
    let handle: fs.promises.FileHandle | undefined;
    try {
      handle = await fs.promises.open(sessionFile, "r");
      const buffer = new Uint8Array(64 * 1024);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      const prefix = new TextDecoder("utf-8").decode(
        buffer.subarray(0, bytesRead),
      );
      for (const line of prefix.split(/\r?\n/)) {
        if (!line.includes('"cwd"')) continue;
        try {
          const value: unknown = JSON.parse(line);
          if (
            typeof value === "object" &&
            value !== null &&
            "cwd" in value &&
            typeof value.cwd === "string" &&
            path.posix.isAbsolute(value.cwd) &&
            matchesClaudeProjectDirectory(
              value.cwd,
              encodedProjectDirectory,
              "linux",
            )
          ) {
            return path.posix.normalize(value.cwd);
          }
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    } finally {
      await handle?.close().catch(() => undefined);
    }
  }
  return decodeClaudeProjectPathLossy(encodedProjectDirectory, "linux");
}

function wslPathForStore(store: WslClaudeStore, linuxPath: string): string {
  const host = store.windowsConfigDirectory
    .toLocaleLowerCase()
    .startsWith("\\\\wsl$\\")
    ? "wsl$"
    : "wsl.localhost";
  return wslLinuxPathToUnc(store.distribution, linuxPath, host);
}

/**
 * List all sessions across all projects
 * @param options.limit - Maximum number of sessions to return (for memory optimization)
 * @param options.afterDate - Only include sessions modified after this date
 */
export async function listAllSessions(options?: {
  limit?: number;
  afterDate?: Date;
  includeInbox?: boolean;
}): Promise<SessionMetadata[]> {
  const sessions: SessionMetadata[] = [];
  const projectDirs = await listProjectDirs();

  const [nativeFiles, wslFiles, supplemental] = await Promise.all([
    collectSessionFiles(projectDirs, options?.limit, options?.afterDate),
    collectWslSessionFiles(options?.limit, options?.afterDate),
    options?.includeInbox === false
      ? Promise.resolve<SupplementalSessionMetadata>({
          desktopBySessionId: new Map(),
          conductorBySessionId: new Map(),
          conductorByWorkspacePath: new Map(),
        })
      : getSupplementalSessionMetadata(),
  ]);
  const filesToParse = [...nativeFiles, ...wslFiles]
    .sort((left, right) => right.mtime.getTime() - left.mtime.getTime())
    .slice(0, options?.limit ?? Number.POSITIVE_INFINITY);

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

  for (const fileInfo of filesToParse) {
    const { filePath, projectDir, mtime } = fileInfo;
    try {
      const metadata = await parseSessionMetadataFast(filePath);
      const projectPath = fileInfo.wsl
        ? fileInfo.wsl.windowsProjectPath
        : metadata.projectPath || (await resolveProjectPathOnce(projectDir));
      const inbox = fileInfo.wsl
        ? {
            sources: [
              {
                backend: "wsl" as const,
                nativePath: filePath,
                externalId: fileInfo.wsl.store.distribution,
                linuxPath: fileInfo.wsl.linuxProjectPath,
              },
            ],
            archived: false,
            workspacePath: projectPath,
          }
        : mergeSessionInboxMetadata(
            metadata.id || path.basename(filePath, ".jsonl"),
            filePath,
            projectPath,
            metadata.entrypoint,
            supplemental,
          );

      sessions.push({
        identity: filePath,
        id: metadata.id || path.basename(filePath, ".jsonl"),
        filePath,
        projectPath,
        projectName: fileInfo.wsl
          ? path.posix.basename(fileInfo.wsl.linuxProjectPath) ||
            fileInfo.wsl.linuxProjectPath
          : getProjectName(projectPath),
        summary: metadata.summary || "",
        firstMessage: metadata.firstMessage || "",
        lastModified: mtime,
        turnCount: metadata.turnCount || 0,
        cost: metadata.cost || 0,
        model: metadata.model,
        permissionMode: metadata.permissionMode,
        title: metadata.title || inbox.title,
        entrypoint: metadata.entrypoint,
        gitBranch: metadata.gitBranch,
        workspacePath: inbox.workspacePath || projectPath,
        archived: inbox.archived,
        sources: inbox.sources,
        desktopLocalSessionId: inbox.desktopLocalSessionId,
        desktopBridgeId: inbox.desktopBridgeId,
        conductorWorkspaceId: inbox.conductorWorkspaceId,
      });
    } catch (error: unknown) {
      if (!isMissingPathError(error)) throw error;
    }
  }

  return sessions;
}

export interface WslSessionProject {
  path: string;
  name: string;
  lastAccessed?: Date;
  sessionCount: number;
  wsl: {
    distribution: string;
    cwd: string;
    claudeExecutable?: string;
  };
}

export async function listWslSessionProjects(): Promise<WslSessionProject[]> {
  const files = await collectWslSessionFiles(undefined, undefined);
  const projects = new Map<string, WslSessionProject>();
  for (const file of files) {
    if (!file.wsl) continue;
    const identity = file.wsl.windowsProjectPath.toLocaleLowerCase();
    const existing = projects.get(identity);
    if (existing) {
      existing.sessionCount++;
      if (!existing.lastAccessed || file.mtime > existing.lastAccessed) {
        existing.lastAccessed = file.mtime;
      }
      continue;
    }
    projects.set(identity, {
      path: file.wsl.windowsProjectPath,
      name:
        path.posix.basename(file.wsl.linuxProjectPath) ||
        file.wsl.linuxProjectPath,
      lastAccessed: file.mtime,
      sessionCount: 1,
      wsl: {
        distribution: file.wsl.store.distribution,
        cwd: file.wsl.linuxProjectPath,
        claudeExecutable: file.wsl.store.claudeExecutable,
      },
    });
  }
  return [...projects.values()].sort(
    (left, right) =>
      (right.lastAccessed?.getTime() ?? 0) -
      (left.lastAccessed?.getTime() ?? 0),
  );
}

/**
 * List sessions for a specific project
 */
export async function listProjectSessions(
  projectPath: string,
): Promise<SessionMetadata[]> {
  const preferredEncodedPath = encodeProjectPath(projectPath);
  let encodedPath = preferredEncodedPath;
  try {
    await fs.promises.access(path.join(PROJECTS_DIR, preferredEncodedPath));
  } catch (error: unknown) {
    if (!isMissingPathError(error)) throw error;
    const projectDirs = await listProjectDirs();
    encodedPath =
      projectDirs.find((directory) =>
        matchesClaudeProjectDirectory(projectPath, directory),
      ) || preferredEncodedPath;
  }
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
        const resolvedPath =
          metadata.projectPath || (await resolveProjectPath(encodedPath));
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
      } catch (error: unknown) {
        if (!isMissingPathError(error)) throw error;
      }
    }
  } catch (error: unknown) {
    if (!isMissingPathError(error)) throw error;
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
 * Updates the persistent JSONL index, then searches its bounded content
 * corpus. Supports cancellation through AbortSignal.
 *
 * @param query - Case-insensitive search string
 * @param onMatch - Called incrementally as matching sessions are found
 * @param signal - AbortSignal to cancel in-flight search
 */
export async function searchSessionContent(
  query: string,
  onMatch: (session: SessionMetadata) => void,
  signal?: AbortSignal,
  onStatus?: (status: SearchIndexStatus) => void,
): Promise<void> {
  const projectDirs = await listProjectDirs();
  if (signal?.aborted) return;

  const sources: SearchIndexSource[] = [];
  const projectPaths = new Map<string, string>();

  for (const projectDir of projectDirs) {
    if (signal?.aborted) return;
    const sessionFiles = await listSessionFiles(projectDir);
    for (const sessionFile of sessionFiles) {
      if (signal?.aborted) return;
      const filePath = path.join(PROJECTS_DIR, projectDir, sessionFile);
      try {
        const stat = await fs.promises.stat(filePath);
        if (!stat.isFile()) continue;
        let projectPath: string | undefined =
          (await readSessionCwdFromFile(filePath, projectDir)) ?? undefined;
        if (!projectPath) {
          projectPath = projectPaths.get(projectDir);
          if (!projectPath) {
            projectPath = await resolveProjectPath(projectDir);
            projectPaths.set(projectDir, projectPath);
          }
        }
        sources.push({
          filePath,
          sourceProjectDir: path.join(PROJECTS_DIR, projectDir),
          projectPath,
          projectName: getProjectName(projectPath),
          mtimeMs: stat.mtimeMs,
          size: stat.size,
        });
      } catch (error: unknown) {
        if (!isMissingPathError(error)) throw error;
      }
    }
  }

  for (const fileInfo of await collectWslSessionFiles(undefined, undefined)) {
    if (signal?.aborted) return;
    if (!fileInfo.wsl) continue;
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(fileInfo.filePath);
    } catch (error: unknown) {
      if (isMissingPathError(error)) continue;
      throw error;
    }
    sources.push({
      filePath: fileInfo.filePath,
      sourceProjectDir: path.win32.dirname(fileInfo.filePath),
      projectPath: fileInfo.wsl.windowsProjectPath,
      projectName:
        path.posix.basename(fileInfo.wsl.linuxProjectPath) ||
        fileInfo.wsl.linuxProjectPath,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      inbox: {
        sources: [
          {
            backend: "wsl",
            nativePath: fileInfo.filePath,
            externalId: fileInfo.wsl.store.distribution,
            linuxPath: fileInfo.wsl.linuxProjectPath,
          },
        ],
        archived: false,
        workspacePath: fileInfo.wsl.windowsProjectPath,
      },
    });
  }

  const supplemental = await getSupplementalSessionMetadata(signal);
  for (const source of sources) {
    if (source.inbox?.sources.some((item) => item.backend === "wsl")) {
      continue;
    }
    source.inbox = mergeSessionInboxMetadata(
      path.basename(source.filePath, ".jsonl"),
      source.filePath,
      source.projectPath,
      undefined,
      supplemental,
    );
  }

  const indexDirectory = path.join(
    environment.supportPath,
    "deep-search-index-v3",
  );
  await updateSessionSearchIndex(indexDirectory, sources, {
    signal,
    onStatus,
  });
  if (signal?.aborted) return;

  await searchSessionIndex(
    indexDirectory,
    query,
    ({ session, matchSnippet, match }) => {
      const permissionMode = isPermissionMode(session.permissionMode)
        ? session.permissionMode
        : undefined;
      onMatch({
        identity: session.sourcePath,
        id: session.sessionId,
        filePath: session.sourcePath,
        projectPath: session.projectPath,
        projectName: session.projectName,
        summary: session.summary,
        firstMessage: session.firstMessage,
        lastModified: new Date(session.mtimeMs),
        turnCount: session.turnCount,
        cost: 0,
        model: session.model,
        matchSnippet,
        permissionMode,
        mentionedFiles: session.mentionedFiles,
        match,
        title: session.title,
        entrypoint: session.entrypoint,
        gitBranch: session.gitBranch,
        workspacePath: session.workspacePath,
        archived: session.archived,
        sources: session.sources,
        desktopLocalSessionId: session.desktopLocalSessionId,
        desktopBridgeId: session.desktopBridgeId,
        conductorWorkspaceId: session.conductorWorkspaceId,
      });
    },
    { signal, onStatus },
  );
}

function isPermissionMode(value: string | undefined): value is PermissionMode {
  return (
    value === "acceptEdits" ||
    value === "auto" ||
    value === "bypassPermissions" ||
    value === "default" ||
    value === "dontAsk" ||
    value === "plan"
  );
}

export interface SessionUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  cacheCreation5mTokens?: number;
  cacheCreation1hTokens?: number;
  model?: string;
}

/** Per-message tokens, used for tier-aware cost calculation per request. */
export interface MessageUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  cacheCreation5mTokens?: number;
  cacheCreation1hTokens?: number;
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
  return new Promise((resolve, reject) => {
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
      let cacheCreation5mTokens = 0;
      let cacheCreation1hTokens = 0;
      let hasDetailedCacheCreation = false;
      for (const m of messages) {
        inputTokens += m.inputTokens;
        outputTokens += m.outputTokens;
        cacheReadTokens += m.cacheReadTokens;
        cacheCreationTokens += m.cacheCreationTokens;
        if (
          m.cacheCreation5mTokens !== undefined ||
          m.cacheCreation1hTokens !== undefined
        ) {
          hasDetailedCacheCreation = true;
          cacheCreation5mTokens += m.cacheCreation5mTokens || 0;
          cacheCreation1hTokens += m.cacheCreation1hTokens || 0;
        }
      }

      let dailyByDate: Map<string, MessageUsage[]> | undefined;
      if (options?.bucketByDay) {
        dailyByDate = new Map();
        for (const m of messages) {
          const dateStr = getLocalDateKey(m.timestamp);
          if (!dateStr) continue;
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
        cacheCreation5mTokens: hasDetailedCacheCreation
          ? cacheCreation5mTokens
          : undefined,
        cacheCreation1hTokens: hasDetailedCacheCreation
          ? cacheCreation1hTokens
          : undefined,
        model,
        messages,
        dailyByDate,
      });
    };

    const safeReject = (error: unknown) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      reject(error);
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
          const timestamp = parseValidDate(entry.timestamp);
          if (!timestamp || timestamp < afterDate) {
            return;
          }
        }

        const usage = entry.message.usage;
        const aggregateCacheCreation = usage.cache_creation_input_tokens || 0;
        const explicit5m = usage.cache_creation?.ephemeral_5m_input_tokens;
        const explicit1h = usage.cache_creation?.ephemeral_1h_input_tokens;
        const cacheCreation = reconcileCacheCreation(
          aggregateCacheCreation,
          explicit5m,
          explicit1h,
        );
        const msg: MessageUsage = {
          inputTokens: usage.input_tokens || 0,
          outputTokens: usage.output_tokens || 0,
          cacheReadTokens: usage.cache_read_input_tokens || 0,
          cacheCreationTokens: cacheCreation.total,
          cacheCreation5mTokens: cacheCreation.fiveMinute,
          cacheCreation1hTokens: cacheCreation.oneHour,
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
    rl.on("error", safeReject);
    stream.on("error", safeReject);
  });
}

/**
 * Delete a session file
 */
export async function deleteSession(
  sessionId: string,
  exactFilePath?: string,
): Promise<boolean> {
  let filePath = exactFilePath;
  if (filePath) {
    const relative = path.relative(PROJECTS_DIR, filePath);
    if (
      !filePath.endsWith(".jsonl") ||
      relative.startsWith("..") ||
      path.isAbsolute(relative)
    ) {
      return false;
    }
  } else {
    const session = await getSessionDetail(sessionId);
    if (!session) return false;
    filePath = session.filePath;
  }

  try {
    await trash(filePath);
    return true;
  } catch {
    return false;
  }
}
