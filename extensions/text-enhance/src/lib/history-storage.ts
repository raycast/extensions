import { LocalStorage, environment } from "@raycast/api";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { HistoryEntry } from "./storage";

const LEGACY_HISTORY_KEY = "generation-history";
const HISTORY_KEY = "generation-history-encryption-key";
const HISTORY_FILE = join(environment.supportPath, "history.json");
const MAX_HISTORY_ITEMS = 50;

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(HISTORY_FILE, "utf8"));
    if (Array.isArray(parsed)) {
      await writeHistoryFile(parsed as HistoryEntry[]);
      return parsed as HistoryEntry[];
    }
    if (!isEncryptedHistory(parsed))
      throw new Error("History file has an invalid format.");
    const key = await readHistoryKey();
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(parsed.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(parsed.data, "base64")),
      decipher.final(),
    ]).toString("utf8");
    const entries: unknown = JSON.parse(plaintext);
    if (!Array.isArray(entries))
      throw new Error("History file has an invalid format.");
    return entries as HistoryEntry[];
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }

  const legacy = await LocalStorage.getItem<string>(LEGACY_HISTORY_KEY);
  if (!legacy) return [];

  let entries: unknown;
  try {
    entries = JSON.parse(legacy);
  } catch {
    throw new Error(
      "Saved history has an invalid format. The old data was kept.",
    );
  }
  if (!Array.isArray(entries)) {
    throw new Error(
      "Saved history has an invalid format. The old data was kept.",
    );
  }

  await writeHistoryFile(entries as HistoryEntry[]);
  await LocalStorage.removeItem(LEGACY_HISTORY_KEY);
  return entries as HistoryEntry[];
}

export async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  await writeHistoryFile(entries.slice(0, MAX_HISTORY_ITEMS));
}

export async function appendHistory(entry: HistoryEntry): Promise<void> {
  const current = await loadHistory();
  await saveHistory([entry, ...current]);
}

async function writeHistoryFile(entries: HistoryEntry[]): Promise<void> {
  await mkdir(environment.supportPath, { recursive: true, mode: 0o700 });
  const key = await getOrCreateHistoryKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(entries), "utf8"),
    cipher.final(),
  ]);
  const envelope = {
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  };
  const temporaryFile = `${HISTORY_FILE}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(envelope), {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporaryFile, HISTORY_FILE);
}

async function readHistoryKey(): Promise<Buffer> {
  const encoded = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!encoded)
    throw new Error(
      "History encryption key is missing. The history file was kept.",
    );
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32)
    throw new Error(
      "History encryption key is invalid. The history file was kept.",
    );
  return key;
}

async function getOrCreateHistoryKey(): Promise<Buffer> {
  const existing = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (existing) return readHistoryKey();
  const key = randomBytes(32);
  await LocalStorage.setItem(HISTORY_KEY, key.toString("base64"));
  return key;
}

function isEncryptedHistory(
  value: unknown,
): value is { version: 1; iv: string; tag: string; data: string } {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.version === 1 &&
    typeof record.iv === "string" &&
    typeof record.tag === "string" &&
    typeof record.data === "string"
  );
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
