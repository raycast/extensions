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
 * Decode an encoded project path from Claude's directory naming
 * e.g., "-Users-siraj-myproject" -> "/Users/siraj/myproject"
 */
export function decodeProjectPath(encodedPath: string): string {
  // Replace leading dash and all dashes with forward slashes
  return "/" + encodedPath.slice(1).replace(/-/g, "/");
}

/**
 * Encode a project path to Claude's directory naming format
 */
export function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/\//g, "-");
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
 */
async function parseSessionMetadataFast(
  filePath: string,
): Promise<Partial<SessionMetadata>> {
  return new Promise((resolve) => {
    const result: Partial<SessionMetadata> = {};
    let lineCount = 0;
    let turnCount = 0;
    let totalCost = 0;

    const stream = fs.createReadStream(filePath, { encoding: "utf8" });
    const rl = readline.createInterface({ input: stream });

    rl.on("line", (line) => {
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
        // Log parse failures for debugging but continue processing
        console.warn(
          `Failed to parse metadata line in ${filePath}: ${line.substring(0, 100)}...`,
        );
      }

      // Read enough lines for metadata
      if (lineCount > 50) {
        rl.close();
        stream.destroy();
      }
    });

    rl.on("close", () => {
      result.turnCount = turnCount;
      result.cost = totalCost;
      resolve(result);
    });

    rl.on("error", () => {
      resolve(result);
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
      } catch (e) {
        // Log parse failures for debugging but continue processing
        console.warn(
          `Failed to parse session line in ${filePath}: ${line.substring(0, 100)}...`,
        );
      }
    });

    rl.on("close", async () => {
      try {
        const stat = await fs.promises.stat(filePath);
        const projectPath = decodeProjectPath(encodedProjectPath);

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
 */
export async function listAllSessions(): Promise<SessionMetadata[]> {
  const sessions: SessionMetadata[] = [];
  const projectDirs = await listProjectDirs();

  for (const projectDir of projectDirs) {
    const sessionFiles = await listSessionFiles(projectDir);

    for (const sessionFile of sessionFiles) {
      const filePath = path.join(PROJECTS_DIR, projectDir, sessionFile);

      try {
        const stat = await fs.promises.stat(filePath);
        const metadata = await parseSessionMetadataFast(filePath);
        const projectPath = decodeProjectPath(projectDir);

        sessions.push({
          id: metadata.id || path.basename(sessionFile, ".jsonl"),
          filePath,
          projectPath,
          projectName: getProjectName(projectPath),
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
  }

  // Sort by last modified (most recent first)
  return sessions.sort(
    (a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
  );
}

/**
 * List sessions for a specific project
 */
export async function listProjectSessions(
  projectPath: string,
): Promise<SessionMetadata[]> {
  const encodedPath = encodeProjectPath(projectPath);
  const allSessions = await listAllSessions();
  return allSessions.filter(
    (s) => s.projectPath === projectPath || s.filePath.includes(encodedPath),
  );
}

/**
 * Get the most recent session
 */
export async function getMostRecentSession(): Promise<SessionMetadata | null> {
  const sessions = await listAllSessions();
  return sessions[0] || null;
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
