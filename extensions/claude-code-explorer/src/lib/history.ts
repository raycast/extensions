import { readFile } from "fs/promises";
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
    const content = await readFile(HISTORY_PATH, "utf-8");
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
  const seen = new Set<string>();
  const sessions: Session[] = [];

  for (const entry of entries) {
    if (!entry.sessionId || seen.has(entry.sessionId)) continue;
    seen.add(entry.sessionId);
    sessions.push({
      id: entry.sessionId,
      display: entry.display,
      timestamp: entry.timestamp,
      project: entry.project,
      projectName: getProjectName(entry.project),
    });
  }

  return sessions.sort((a, b) => b.timestamp - a.timestamp);
}

function getSessionPath(session: Session): string {
  const encoded = encodeProjectPath(session.project);
  return join(PROJECTS_DIR, encoded, `${session.id}.jsonl`);
}

export async function loadConversation(
  session: Session,
): Promise<ConversationMessage[]> {
  try {
    const filePath = getSessionPath(session);
    const content = await readFile(filePath, "utf-8");
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
