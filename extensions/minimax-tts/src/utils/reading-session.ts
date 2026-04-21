import { LocalStorage } from "@raycast/api";
import { createHash } from "crypto";
import type { TTSOptions } from "../api/types";
import { chunkText } from "./text-chunker";
import type { TextSourceKind } from "./text-source";

const LAST_READING_SESSION_KEY = "last-reading-session";

export interface ReadingSession {
  textHash: string;
  text: string;
  source: TextSourceKind;
  chunks: string[];
  nextChunkIndex: number;
  options: TTSOptions;
  createdAt: string;
  updatedAt: string;
}

export interface PreparedReadingSession {
  session: ReadingSession;
  isResuming: boolean;
}

export async function prepareReadingSession(
  text: string,
  source: TextSourceKind,
  options: TTSOptions,
): Promise<PreparedReadingSession> {
  const trimmedText = text.trim();
  const textHash = hashText(trimmedText);
  const chunks = chunkText(trimmedText);
  const existing = await getLastReadingSession();
  const now = new Date().toISOString();

  if (existing?.textHash === textHash && existing.nextChunkIndex > 0 && existing.nextChunkIndex < chunks.length) {
    const session = {
      ...existing,
      source,
      chunks,
      options,
      updatedAt: now,
    };
    await saveReadingSession(session);
    return { session, isResuming: true };
  }

  const session: ReadingSession = {
    textHash,
    text: trimmedText,
    source,
    chunks,
    nextChunkIndex: 0,
    options,
    createdAt: now,
    updatedAt: now,
  };
  await saveReadingSession(session);
  return { session, isResuming: false };
}

export async function getLastReadingSession(): Promise<ReadingSession | null> {
  const raw = await LocalStorage.getItem<string>(LAST_READING_SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as ReadingSession;
    if (!session.textHash || !Array.isArray(session.chunks) || session.chunks.length === 0) return null;
    return session;
  } catch {
    return null;
  }
}

export async function saveReadingSession(session: ReadingSession): Promise<void> {
  await LocalStorage.setItem(
    LAST_READING_SESSION_KEY,
    JSON.stringify({
      ...session,
      nextChunkIndex: clampChunkIndex(session.nextChunkIndex, session.chunks.length),
      updatedAt: new Date().toISOString(),
    }),
  );
}

export async function updateReadingProgress(session: ReadingSession, nextChunkIndex: number): Promise<ReadingSession> {
  const updatedSession = {
    ...session,
    nextChunkIndex: clampChunkIndex(nextChunkIndex, session.chunks.length),
    updatedAt: new Date().toISOString(),
  };
  await saveReadingSession(updatedSession);
  return updatedSession;
}

export async function restartReadingSession(session: ReadingSession): Promise<ReadingSession> {
  return updateReadingProgress(session, 0);
}

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function clampChunkIndex(index: number, chunkCount: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(Math.trunc(index), chunkCount));
}
