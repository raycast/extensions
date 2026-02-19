import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";
import { trash } from "@raycast/api";

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
}

export interface SessionMessage {
  type: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
  toolUse?: boolean;
}

export interface SessionDetail extends SessionMetadata {
  messages: SessionMessage[];
}

interface JSONLEntry {
  type: string;
  summary?: string;
  leafUuid?: string;
  uuid?: string;
  message?: {
    role: string;
    content: string | Array<{ type: string; text?: string }>;
  };
  costUSD?: number;
  model?: string;
  timestamp?: string;
}

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");

/**
 * Decode an encoded project path from Claude's directory naming.
 * WARNING: This is a lossy heuristic — Claude encodes both / and . as -,
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
 *   1. sessions-index.json — authoritative originalPath written by Claude Code
 *   2. Filesystem-guided walk — uses os.homedir() as anchor, then probes the
 *      filesystem to disambiguate each "-" (could be /, ., or literal -)
 *   3. Naive decode — replaces every "-" with "/" (known-lossy, last resort)
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

  // 3. Naive decode (last resort — known-lossy, only cache if path exists)
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
 * components against real directory entries — longest component first so
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
      // Single empty part — skip (a bare "." by itself is not useful)
      continue;
    }

    const candidatePath = path.join(basePath, component);

    try {
      const stat = await fs.promises.stat(candidatePath);

      if (remaining.length === 0) {
        // Last component — any file type is fine
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

  return null;
}

/**
 * Encode a project path to Claude's directory naming format.
 * Claude Code (verified as of v1.x) replaces both / and . with -.
 * Confirmed empirically by inspecting ~/.claude/projects/ directory names
 * against their corresponding originalPath values in sessions-index.json.
 */
export function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/[/.]/g, "-");
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
    let totalCost = 0;
    let resolved = false;

    // Helper to safely resolve only once and clean up
    const safeResolve = () => {
      if (resolved) return;
      resolved = true;
      result.turnCount = turnCount;
      result.cost = totalCost;
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
          result.summary = entry.summary || "";
          result.id = entry.leafUuid || path.basename(filePath, ".jsonl");
        }

        if (entry.type === "user" || entry.type === "human") {
          turnCount++;
          if (!result.firstMessage && entry.message?.content) {
            const content = entry.message.content;
            if (typeof content === "string") {
              result.firstMessage = content.slice(0, 200);
            } else if (Array.isArray(content)) {
              const textBlock = content.find((b) => b.type === "text");
              result.firstMessage = textBlock?.text?.slice(0, 200) || "";
            }
          }
        }

        if (entry.type === "assistant") {
          turnCount++;
        }

        if (entry.costUSD) {
          totalCost += entry.costUSD;
        }

        if (entry.model) {
          result.model = entry.model;
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

/**
 * Get full session details including all messages
 */
export async function getSessionDetail(
  sessionId: string,
): Promise<SessionDetail | null> {
  // Find the session file
  const projectDirs = await listProjectDirs();

  for (const projectDir of projectDirs) {
    const sessionFiles = await listSessionFiles(projectDir);
    const matchingFile = sessionFiles.find(
      (f) => f === `${sessionId}.jsonl` || f.includes(sessionId),
    );

    if (matchingFile) {
      const filePath = path.join(PROJECTS_DIR, projectDir, matchingFile);
      return parseFullSession(filePath, projectDir);
    }
  }

  return null;
}

/**
 * Parse a full session file using streaming to handle large files
 */
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

          if (!firstMessage) {
            firstMessage = content.slice(0, 200);
          }

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
              if (block.type === "text") {
                content += block.text || "";
              } else if (block.type === "tool_use") {
                hasToolUse = true;
              }
            }
          }

          messages.push({
            type: "assistant",
            content,
            timestamp: entry.timestamp ? new Date(entry.timestamp) : undefined,
            toolUse: hasToolUse,
          });
        }

        if (entry.costUSD) {
          totalCost += entry.costUSD;
        }

        if (entry.model) {
          model = entry.model;
        }
      } catch {
        // Skip unparseable lines silently to avoid memory accumulation
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
  const afterDate = options?.afterDate;
  const limit = options?.limit;

  // First, collect all file paths with their modification times
  // This is faster than parsing each file
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

        // Skip files older than afterDate if specified
        if (afterDate && stat.mtime < afterDate) {
          continue;
        }

        fileInfos.push({
          filePath,
          projectDir,
          mtime: stat.mtime,
        });
      } catch {
        // Skip files we can't stat
      }
    }
  }

  // Sort by modification time (most recent first) before parsing
  // This way we can stop early if we have a limit
  fileInfos.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  // Apply limit to reduce the number of files we need to parse
  const filesToParse = limit ? fileInfos.slice(0, limit) : fileInfos;

  // Now parse only the files we need
  for (const { filePath, projectDir, mtime } of filesToParse) {
    try {
      const metadata = await parseSessionMetadataFast(filePath);
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
      });
    } catch {
      // Skip files we can't read
    }
  }

  // Already sorted, just return
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
} | null> {
  type MatchResult = {
    id: string;
    summary: string;
    firstMessage: string;
    turnCount: number;
    cost: number;
    model?: string;
  };

  return new Promise<MatchResult | null>((resolve) => {
    let found = false;
    let summary = "";
    let id = path.basename(filePath, ".jsonl");
    let firstMessage = "";
    let turnCount = 0;
    let totalCost = 0;
    let model: string | undefined;
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
          summary = entry.summary || "";
          id = entry.leafUuid || id;
        }

        // Extract message content
        let content = "";
        if (entry.message?.content) {
          if (typeof entry.message.content === "string") {
            content = entry.message.content;
          } else if (Array.isArray(entry.message.content)) {
            content = entry.message.content
              .filter((b) => b.type === "text")
              .map((b) => b.text || "")
              .join(" ");
          }
        }

        if (entry.type === "user" || entry.type === "human") {
          turnCount++;
          if (!firstMessage && content) {
            firstMessage = content.slice(0, 200);
          }
        }

        if (entry.type === "assistant") {
          turnCount++;
        }

        if (entry.costUSD) totalCost += entry.costUSD;
        if (entry.model) model = entry.model;

        // Check for match in content and summary
        if (!found) {
          if (
            (content && content.toLowerCase().includes(lowerQuery)) ||
            (summary && summary.toLowerCase().includes(lowerQuery))
          ) {
            found = true;
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
          ? { id, summary, firstMessage, turnCount, cost: totalCost, model }
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
