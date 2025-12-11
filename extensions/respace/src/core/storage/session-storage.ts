import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type {
  SessionsData,
  TrackedWindow,
  WorkspaceSession,
} from "../../types/workspace";
import { CONFIG_DIR, SESSIONS_FILE } from "./constants";

/**
 * Ensures the config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Reads sessions from storage
 */
export function readSessions(): SessionsData {
  ensureConfigDir();

  if (!existsSync(SESSIONS_FILE)) {
    return { sessions: [] };
  }

  try {
    const data = readFileSync(SESSIONS_FILE, "utf-8");
    return JSON.parse(data) as SessionsData;
  } catch (error) {
    console.error("Error reading sessions:", error);
    return { sessions: [] };
  }
}

/**
 * Writes sessions to storage
 */
export function writeSessions(data: SessionsData): void {
  ensureConfigDir();

  try {
    writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing sessions:", error);
    throw error;
  }
}

/**
 * Gets an active session by workspace ID
 */
export function getActiveSession(
  workspaceId: string,
): WorkspaceSession | undefined {
  const data = readSessions();
  return data.sessions.find((s) => s.workspaceId === workspaceId);
}

/**
 * Gets all active sessions
 */
export function getAllSessions(): WorkspaceSession[] {
  return readSessions().sessions;
}

/**
 * Creates a new workspace session
 */
export function createSession(
  workspaceId: string,
  windows: TrackedWindow[],
): WorkspaceSession {
  const data = readSessions();

  // Remove any existing session for this workspace
  data.sessions = data.sessions.filter((s) => s.workspaceId !== workspaceId);

  const newSession: WorkspaceSession = {
    workspaceId,
    openedAt: Date.now(),
    windows,
  };

  data.sessions.push(newSession);
  writeSessions(data);

  return newSession;
}

/**
 * Updates an existing workspace session
 */
export function updateSession(
  workspaceId: string,
  windows: TrackedWindow[],
): WorkspaceSession | null {
  const data = readSessions();
  const index = data.sessions.findIndex((s) => s.workspaceId === workspaceId);

  if (index === -1) {
    return null;
  }

  const updatedSession: WorkspaceSession = {
    ...data.sessions[index],
    windows,
    lastVerified: Date.now(),
  };

  data.sessions[index] = updatedSession;
  writeSessions(data);

  return updatedSession;
}

/**
 * Deletes a workspace session
 */
export function deleteSession(workspaceId: string): boolean {
  const data = readSessions();
  const initialLength = data.sessions.length;

  data.sessions = data.sessions.filter((s) => s.workspaceId !== workspaceId);

  if (data.sessions.length < initialLength) {
    writeSessions(data);
    return true;
  }

  return false;
}

/**
 * Checks if a workspace has an active session
 */
export function hasActiveSession(workspaceId: string): boolean {
  return getActiveSession(workspaceId) !== undefined;
}
