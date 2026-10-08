import { LocalStorage } from "@raycast/api";
import { environment } from "@raycast/api";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ChatTurn } from "./continue-chat";
import { fileExtensionForMediaType } from "./clipboard-image";

/** Previous key; data is migrated on read. */
const LEGACY_SESSIONS_KEY = "screen-ai:sessions-v1";

const SESSIONS_KEY = "read-my-screen:sessions-v1";
const MAX_SESSIONS = 20;

function shortPreview(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function previewFromMessages(messages: ChatTurn[]): string {
  const assistant = messages.find((m) => m.role === "assistant");
  return shortPreview(assistant?.content ?? "", 120);
}

export type StoredSession = {
  id: string;
  createdAt: number;
  /** Short label (often derived from the user prompt). */
  title: string;
  /** Short assistant reply preview for the history list. */
  preview?: string;
  source: "browser" | "screen";
  messages: ChatTurn[];
  /** Relative to {@link historyImageDir} */
  imageFileName?: string;
  screenMediaType?: string;
};

function historyImageDir(): string {
  const dir = join(environment.supportPath, "session-history-images");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function loadStoredSessions(): Promise<StoredSession[]> {
  let raw = await LocalStorage.getItem<string>(SESSIONS_KEY);
  if (!raw?.trim()) {
    raw = await LocalStorage.getItem<string>(LEGACY_SESSIONS_KEY);
    if (raw?.trim()) {
      await LocalStorage.setItem(SESSIONS_KEY, raw);
    }
  }
  if (!raw?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (s): s is StoredSession =>
        s &&
        typeof s === "object" &&
        typeof (s as StoredSession).id === "string" &&
        typeof (s as StoredSession).createdAt === "number" &&
        typeof (s as StoredSession).title === "string" &&
        ((s as StoredSession).source === "browser" || (s as StoredSession).source === "screen") &&
        Array.isArray((s as StoredSession).messages) &&
        ((s as StoredSession).preview === undefined || typeof (s as StoredSession).preview === "string"),
    );
  } catch {
    return [];
  }
}

async function persistSessionList(sessions: StoredSession[]): Promise<void> {
  await LocalStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
}

function safeUnlinkImage(fileName: string | undefined): void {
  if (!fileName) {
    return;
  }
  const full = join(historyImageDir(), fileName);
  if (existsSync(full)) {
    try {
      unlinkSync(full);
    } catch {
      /* ignore */
    }
  }
}

export type AppendSessionInput = {
  title: string;
  source: "browser" | "screen";
  messages: ChatTurn[];
  screenBase64?: string;
  screenMediaType?: string;
};

export async function appendStoredSession(input: AppendSessionInput): Promise<void> {
  const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  let imageFileName: string | undefined;
  let screenMediaType: string | undefined;

  if (input.source === "screen" && input.screenBase64) {
    const mt = input.screenMediaType?.trim() || "image/png";
    screenMediaType = mt;
    const ext = fileExtensionForMediaType(mt);
    imageFileName = `${id}${ext}`;
    const full = join(historyImageDir(), imageFileName);
    writeFileSync(full, Buffer.from(input.screenBase64, "base64"));
  }

  const record: StoredSession = {
    id,
    createdAt: Date.now(),
    title: input.title,
    preview: previewFromMessages(input.messages),
    source: input.source,
    messages: input.messages,
    imageFileName,
    screenMediaType,
  };

  const list = await loadStoredSessions();
  const combined = [record, ...list];
  const dropped = combined.slice(MAX_SESSIONS);
  for (const removed of dropped) {
    safeUnlinkImage(removed.imageFileName);
  }
  await persistSessionList(combined.slice(0, MAX_SESSIONS));
}

/** Absolute path to the saved screen capture for a session, if any. */
export function getSessionScreenImagePath(record: StoredSession): string | null {
  if (record.source !== "screen" || !record.imageFileName) {
    return null;
  }
  const full = join(historyImageDir(), record.imageFileName);
  return existsSync(full) ? full : null;
}

export function readSessionImageFile(record: StoredSession): { base64: string; mediaType: string } | null {
  if (record.source !== "screen" || !record.imageFileName) {
    return null;
  }
  const full = join(historyImageDir(), record.imageFileName);
  if (!existsSync(full)) {
    return null;
  }
  const buf = readFileSync(full);
  const mediaType = record.screenMediaType?.trim() || "image/png";
  return { base64: buf.toString("base64"), mediaType };
}

export function historyListPreview(record: StoredSession): string {
  return record.preview?.trim() || previewFromMessages(record.messages);
}

export async function deleteStoredSession(id: string): Promise<void> {
  const list = await loadStoredSessions();
  const found = list.find((s) => s.id === id);
  if (found) {
    safeUnlinkImage(found.imageFileName);
  }
  await persistSessionList(list.filter((s) => s.id !== id));
}

export function chatToMarkdown(messages: ChatTurn[], footerMarkdown?: string): string {
  const parts: string[] = [];
  for (const m of messages) {
    const heading = m.role === "user" ? "### You" : "### Assistant";
    parts.push(`${heading}\n\n${m.content.trim()}\n`);
  }
  const body = parts.join("\n---\n\n");
  const foot = footerMarkdown?.trim();
  if (!foot) {
    return body;
  }
  return `${body}\n\n---\n\n${foot}\n`;
}
