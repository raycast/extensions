import { getPreferenceValues } from "@raycast/api";
import { readdir, readFile, rm } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

import { Message, Part, Project, Session, TranscriptEntry } from "../types";

const SUPPORTED_MIGRATION = 2;

function getStoragePath(): string {
  const prefs = getPreferenceValues<ExtensionPreferences>();

  if (prefs.storagePath) {
    return prefs.storagePath.replace(/^~/, homedir());
  }

  return join(homedir(), ".local", "share", "opencode", "storage");
}

export async function checkStorageVersion(): Promise<string | null> {
  const base = getStoragePath();

  try {
    const raw = await readFile(join(base, "migration"), "utf-8");
    const version = parseInt(raw.trim(), 10);

    if (isNaN(version)) {
      return "Could not read OpenCode storage version.";
    }

    if (version !== SUPPORTED_MIGRATION) {
      return (
        `Opencode storage format has changed (version ${version} — this extension only supports version ${SUPPORTED_MIGRATION}). ` +
        `This extension needs to be updated.`
      );
    }

    return null;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return "No OpenCode data found. Run opencode at least once to create the storage directory.";
    }

    return "Could not read OpenCode storage version.";
  }
}

async function readJsonFiles<T>(dirPath: string): Promise<T[]> {
  let entries: string[];

  try {
    entries = await readdir(dirPath);
  } catch {
    return [];
  }

  const jsonFiles = entries.filter((f) => f.endsWith(".json"));
  const results: T[] = [];

  const reads = jsonFiles.map(async (file) => {
    try {
      const raw = await readFile(join(dirPath, file), "utf-8");
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  });

  const settled = await Promise.all(reads);

  for (const item of settled) {
    if (item !== null) {
      results.push(item);
    }
  }

  return results;
}

export async function loadProjects(): Promise<Project[]> {
  const base = getStoragePath();

  return readJsonFiles<Project>(join(base, "project"));
}

export async function loadSessions(): Promise<Session[]> {
  const base = getStoragePath();
  const sessionDir = join(base, "session");

  let projectDirs: string[];

  try {
    projectDirs = await readdir(sessionDir);
  } catch {
    return [];
  }

  const allSessions: Session[] = [];

  const reads = projectDirs.map(async (projectID) => {
    return readJsonFiles<Session>(join(sessionDir, projectID));
  });

  const results = await Promise.all(reads);

  for (const sessions of results) {
    allSessions.push(...sessions);
  }

  // Filter out sub-agent sessions (those with a parentID)
  const topLevel = allSessions.filter((s) => !s.parentID);

  // Sort by updated time descending (most recent first)
  topLevel.sort((a, b) => b.time.updated - a.time.updated);

  return topLevel;
}

export async function loadMessages(sessionID: string): Promise<Message[]> {
  const base = getStoragePath();
  const messages = await readJsonFiles<Message>(join(base, "message", sessionID));

  // Sort by ID ascending (IDs are ULID-based, ascending = chronological)
  messages.sort((a, b) => a.id.localeCompare(b.id));

  return messages;
}

export async function loadParts(messageID: string): Promise<Part[]> {
  const base = getStoragePath();

  return readJsonFiles<Part>(join(base, "part", messageID));
}

export async function loadTranscript(sessionID: string): Promise<TranscriptEntry[]> {
  const messages = await loadMessages(sessionID);
  const entries: TranscriptEntry[] = [];

  const partLoads = messages.map(async (message) => {
    const parts = await loadParts(message.id);

    return { message, parts };
  });

  const results = await Promise.all(partLoads);

  for (const entry of results) {
    const relevantParts = entry.parts.filter((p) => (p.type === "text" && p.text) || p.type === "tool");

    if (relevantParts.length > 0) {
      entries.push({ message: entry.message, parts: relevantParts });
    }
  }

  // Maintain chronological order from the message sort
  entries.sort((a, b) => a.message.id.localeCompare(b.message.id));

  return entries;
}

function safePath(base: string, ...segments: string[]): string {
  const resolved = join(base, ...segments);

  if (!resolved.startsWith(base)) {
    throw new Error(`Path traversal detected: ${resolved}`);
  }

  return resolved;
}

async function deleteSessionData(base: string, session: Session): Promise<void> {
  // Load messages first so we know which part dirs to remove
  const messages = await loadMessages(session.id);

  // Remove part directories for each message
  await Promise.all(messages.map((msg) => rm(safePath(base, "part", msg.id), { recursive: true, force: true })));

  // Remove message directory
  await rm(safePath(base, "message", session.id), { recursive: true, force: true });

  // Remove session file
  await rm(safePath(base, "session", session.projectID, `${session.id}.json`), { force: true });

  // Remove session diff file if it exists
  await rm(safePath(base, "session_diff", `${session.id}.json`), { force: true });

  // Remove share file if it exists
  await rm(safePath(base, "share", `${session.id}.json`), { force: true });
}

function collectDescendants(sessionID: string, allSessions: Session[]): Session[] {
  const children = allSessions.filter((s) => s.parentID === sessionID);

  return children.flatMap((child) => [child, ...collectDescendants(child.id, allSessions)]);
}

export async function deleteSession(session: Session): Promise<void> {
  const base = getStoragePath();

  // Load all project sessions to find the full descendant tree
  const allProjectSessions = await readJsonFiles<Session>(join(base, "session", session.projectID));
  const descendants = collectDescendants(session.id, allProjectSessions);

  // Delete descendants and the session itself in parallel
  await Promise.all([...descendants, session].map((s) => deleteSessionData(base, s)));
}

export async function deleteAllProjectSessions(projectID: string): Promise<void> {
  const base = getStoragePath();

  // Load ALL sessions for this project (including sub-agents)
  const sessions = await readJsonFiles<Session>(safePath(base, "session", projectID));

  // Delete all sessions' messages and parts in parallel
  await Promise.all(sessions.map((session) => deleteSessionData(base, session)));

  // Remove the entire session directory for this project
  await rm(safePath(base, "session", projectID), { recursive: true, force: true });

  // Remove the project file
  await rm(safePath(base, "project", `${projectID}.json`), { force: true });
}
