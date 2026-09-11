import { LocalStorage } from "@raycast/api";
import { createHash } from "crypto";
import { buildOptionsFromPrefs, isSupportedModel, resolveOptionsForText } from "../api/gemini-tts";
import type { TTSOptions } from "../api/types";
import { GEMINI_VOICES } from "../constants/voices";
import { chunkText } from "./text-chunker";
import type { TextSourceKind } from "./text-source";

const LAST_READING_SESSION_KEY = "last-reading-session";
const GEMINI_VOICE_IDS = new Set(GEMINI_VOICES.map((voice) => voice.id));

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
  const resolvedOptions = resolveOptionsForText(options, trimmedText);
  const now = new Date().toISOString();

  if (existing?.textHash === textHash && existing.nextChunkIndex > 0 && existing.nextChunkIndex < chunks.length) {
    const session = {
      ...existing,
      source,
      chunks,
      // Preserve the session's last live speed so a user-adjusted pace
      // survives a Quick Read re-trigger on the same text. Other knobs
      // (voice, model, language) still pick up the latest preferences.
      options: { ...resolvedOptions, speed: existing.options.speed },
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
    options: resolvedOptions,
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
    return { ...session, options: normalizeSessionOptions(session.options) };
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

function normalizeSessionOptions(rawOptions: Partial<TTSOptions> | undefined): TTSOptions {
  const prefsOptions = buildOptionsFromPrefs();
  const rawModel = typeof rawOptions?.model === "string" ? rawOptions.model : "";
  const rawVoiceId = typeof rawOptions?.voiceId === "string" ? rawOptions.voiceId : "";

  return {
    ...prefsOptions,
    model: isSupportedModel(rawModel) ? rawModel : prefsOptions.model,
    voiceId: GEMINI_VOICE_IDS.has(rawVoiceId) ? rawVoiceId : prefsOptions.voiceId,
    languageMode: prefsOptions.languageMode,
    readingExperience: prefsOptions.readingExperience,
    expressiveness: prefsOptions.expressiveness,
    audioTagMode: prefsOptions.audioTagMode,
    speed: normalizeSpeed(rawOptions?.speed, prefsOptions.speed),
    directorNotes:
      typeof rawOptions?.directorNotes === "string" ? rawOptions.directorNotes : prefsOptions.directorNotes,
    sampleRate: typeof rawOptions?.sampleRate === "number" ? rawOptions.sampleRate : prefsOptions.sampleRate,
  };
}

function normalizeSpeed(rawSpeed: unknown, fallback: number): number {
  const parsed = typeof rawSpeed === "number" ? rawSpeed : Number(rawSpeed);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0.5, Math.min(2, parsed));
}
