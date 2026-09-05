import { environment, LocalStorage } from "@raycast/api";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import {
  encryptJson,
  readEncryptedJson,
  writeEncryptedJson,
  writeEncryptedPayload,
} from "./crypto-store";
import { selectSessionsToKeep } from "./history-retention";
import type {
  ChatSession,
  HistorySettings,
  SessionMetadata,
  StorageStats,
} from "./types";

export const MAX_HISTORY_BYTES = 10 * 1024 * 1024 * 1024;

const HISTORY_SETTINGS_KEY = "history-settings-v1";
const HISTORY_DIRECTORY = path.join(
  environment.supportPath,
  "encrypted-history-v1",
);
const HISTORY_INDEX = path.join(HISTORY_DIRECTORY, "index.enc");

interface HistoryIndex {
  version: 1;
  sessions: SessionMetadata[];
}

function sessionPath(id: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(id))
    throw new Error("Invalid session identifier.");
  return path.join(HISTORY_DIRECTORY, `${id}.chat`);
}

function metadataFor(session: ChatSession, bytes: number): SessionMetadata {
  return {
    id: session.id,
    title: session.title,
    providerId: session.providerId,
    providerName: session.providerName,
    modelId: session.modelId,
    messageCount: session.messages.length,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    bytes,
  };
}

async function rebuildIndex(): Promise<HistoryIndex> {
  await mkdir(HISTORY_DIRECTORY, { recursive: true });
  const sessions: SessionMetadata[] = [];
  for (const name of await readdir(HISTORY_DIRECTORY)) {
    if (!name.endsWith(".chat")) continue;
    try {
      const fullPath = path.join(HISTORY_DIRECTORY, name);
      const session = await readEncryptedJson<ChatSession>(fullPath);
      if (!session) continue;
      const fileStats = await stat(fullPath);
      sessions.push(metadataFor(session, fileStats.size));
    } catch {
      // A corrupt individual chat should not make all history unavailable.
    }
  }
  const index: HistoryIndex = { version: 1, sessions };
  await writeEncryptedJson(HISTORY_INDEX, index);
  return index;
}

async function loadIndex(): Promise<HistoryIndex> {
  try {
    return (
      (await readEncryptedJson<HistoryIndex>(HISTORY_INDEX)) ??
      (await rebuildIndex())
    );
  } catch {
    return rebuildIndex();
  }
}

async function saveIndex(sessions: SessionMetadata[]): Promise<void> {
  await writeEncryptedJson(HISTORY_INDEX, {
    version: 1,
    sessions,
  } satisfies HistoryIndex);
}

export async function getHistorySettings(): Promise<HistorySettings> {
  const stored = await LocalStorage.getItem<string>(HISTORY_SETTINGS_KEY);
  if (!stored) return { sessionLimit: "unlimited" };
  try {
    const parsed = JSON.parse(stored) as HistorySettings;
    if (parsed.sessionLimit === "unlimited") return parsed;
    if (Number.isInteger(parsed.sessionLimit) && parsed.sessionLimit > 0)
      return parsed;
  } catch {
    // Fall through to the safe default.
  }
  return { sessionLimit: "unlimited" };
}

export async function saveHistorySettings(
  settings: HistorySettings,
): Promise<void> {
  await LocalStorage.setItem(HISTORY_SETTINGS_KEY, JSON.stringify(settings));
  await enforceRetention();
}

export async function listSessionMetadata(): Promise<SessionMetadata[]> {
  return (await loadIndex()).sessions.sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function getSession(id: string): Promise<ChatSession | undefined> {
  return readEncryptedJson<ChatSession>(sessionPath(id));
}

export async function saveSession(session: ChatSession): Promise<void> {
  const payload = await encryptJson(session);
  const bytes = Buffer.byteLength(payload, "utf8");
  if (bytes > MAX_HISTORY_BYTES)
    throw new Error("This conversation exceeds the 10 GB history limit.");
  await writeEncryptedPayload(sessionPath(session.id), payload);

  const index = await loadIndex();
  const sessions = index.sessions.filter((item) => item.id !== session.id);
  sessions.push(metadataFor(session, bytes));
  await pruneAndSave(sessions, session.id);
}

async function pruneAndSave(
  sessions: SessionMetadata[],
  protectedId?: string,
): Promise<void> {
  const settings = await getHistorySettings();
  const retention = selectSessionsToKeep(
    sessions,
    settings,
    MAX_HISTORY_BYTES,
    protectedId,
  );
  if (retention.overLimit) {
    throw new Error(
      "Unable to save the conversation within the 10 GB history limit.",
    );
  }

  for (const item of retention.removed)
    await rm(sessionPath(item.id), { force: true });
  await saveIndex(retention.kept);
}

export async function enforceRetention(): Promise<void> {
  const index = await loadIndex();
  await pruneAndSave(index.sessions);
}

export async function deleteSession(id: string): Promise<void> {
  await rm(sessionPath(id), { force: true });
  const index = await loadIndex();
  await saveIndex(index.sessions.filter((item) => item.id !== id));
}

export async function clearHistory(): Promise<void> {
  await rm(HISTORY_DIRECTORY, { recursive: true, force: true });
  await mkdir(HISTORY_DIRECTORY, { recursive: true });
  await saveIndex([]);
}

export async function getStorageStats(): Promise<StorageStats> {
  const sessions = (await loadIndex()).sessions;
  return {
    sessionCount: sessions.length,
    bytes: sessions.reduce((sum, item) => sum + item.bytes, 0),
    maxBytes: MAX_HISTORY_BYTES,
  };
}

export function createSessionTitle(prompt: string): string {
  const singleLine = prompt.replace(/\s+/g, " ").trim();
  return singleLine.length > 64
    ? `${singleLine.slice(0, 61)}...`
    : singleLine || "New Chat";
}
