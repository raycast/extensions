import { readFile, stat, open } from "fs/promises";
import { homedir } from "os";
import { join, basename } from "path";
import type { HistoryEntry, ConversationMessage, Session } from "./types";
import {
  encodeProjectPath,
  extractTextContent,
  isToolResultOnly,
} from "./utils";

const CLAUDE_DIR = join(homedir(), ".claude");
const HISTORY_PATH = join(CLAUDE_DIR, "history.jsonl");
const PROJECTS_DIR = join(CLAUDE_DIR, "projects");
const MAX_READ_BYTES = 2 * 1024 * 1024; // 2MB cap per session file

function parseJsonl<T>(content: string): T[] {
  const results: T[] = [];
  for (const line of content.trim().split("\n")) {
    if (!line) continue;
    try {
      results.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }
  return results;
}

export async function loadHistoryEntries(): Promise<HistoryEntry[]> {
  try {
    const content = await safeReadFile(HISTORY_PATH, MAX_READ_BYTES);
    return parseJsonl<HistoryEntry>(content);
  } catch {
    return [];
  }
}

export function getUniqueProjects(entries: HistoryEntry[]): string[] {
  const projects = new Set(entries.map((e) => e.project).filter(Boolean));
  return [...projects].sort();
}

export function getProjectName(projectPath: string): string {
  return basename(projectPath);
}

export function buildSessions(entries: HistoryEntry[]): Session[] {
  const map = new Map<string, Session>();

  for (const entry of entries) {
    if (!entry.sessionId) continue;

    const existing = map.get(entry.sessionId);
    if (!existing) {
      map.set(entry.sessionId, {
        id: entry.sessionId,
        display: entry.display,
        timestamp: entry.timestamp,
        lastActiveAt: entry.timestamp,
        project: entry.project,
        projectName: getProjectName(entry.project),
      });
    } else {
      if (entry.timestamp > existing.lastActiveAt) {
        existing.lastActiveAt = entry.timestamp;
      }
    }
  }

  return [...map.values()];
}

function getSessionPath(session: Session): string {
  const encoded = encodeProjectPath(session.project);
  return join(PROJECTS_DIR, encoded, `${session.id}.jsonl`);
}

async function readLineAligned(
  fd: Awaited<ReturnType<typeof open>>,
  offset: number,
  bytes: number,
  direction: "head" | "tail",
): Promise<string> {
  // Read extra 64 bytes to avoid splitting a multi-byte UTF-8 char mid-sequence
  const extra = 64;
  const buf = Buffer.alloc(bytes + extra);
  const { bytesRead } = await fd.read(buf, 0, bytes + extra, offset);
  const str = buf.subarray(0, bytesRead).toString("utf-8");

  if (direction === "head") {
    // Trim to last complete line
    const end = str.lastIndexOf("\n");
    return end > 0 ? str.slice(0, end) : str;
  }
  // Trim to first complete line (skip partial leading line)
  const start = str.indexOf("\n");
  return start >= 0 ? str.slice(start + 1) : str;
}

async function safeReadFile(path: string, maxBytes: number): Promise<string> {
  const s = await stat(path);
  if (s.size <= maxBytes) {
    return readFile(path, "utf-8");
  }
  const half = Math.floor(maxBytes / 2);
  const fd = await open(path, "r");
  try {
    const head = await readLineAligned(fd, 0, half, "head");
    const tail = await readLineAligned(fd, s.size - half, half, "tail");
    return head + "\n" + tail;
  } finally {
    await fd.close();
  }
}

export async function loadConversation(
  session: Session,
): Promise<ConversationMessage[]> {
  try {
    const filePath = getSessionPath(session);
    const content = await safeReadFile(filePath, MAX_READ_BYTES);
    const messages = parseJsonl<ConversationMessage>(content);
    return messages.filter((m) => m.type === "user" || m.type === "assistant");
  } catch {
    return [];
  }
}

export function formatMessagesAsMarkdown(
  messages: ConversationMessage[],
): string {
  if (messages.length === 0) return "*No messages found*";

  const parts: string[] = [];

  for (const msg of messages) {
    if (!msg.message) continue;

    // Skip user messages that are only tool results (not actual user input)
    if (msg.type === "user" && isToolResultOnly(msg.message.content)) continue;

    const role = msg.type === "user" ? "User" : "Assistant";
    const text = extractTextContent(msg.message.content);
    if (!text) continue;

    parts.push(`### ${role}\n${text}`);
  }

  return parts.length > 0 ? parts.join("\n\n") : "*No messages found*";
}
