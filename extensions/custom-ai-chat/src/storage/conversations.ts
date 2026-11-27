import { environment } from "@raycast/api";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { getErrorMessage, isNodeError, isRecord } from "../lib/guards";
import type { Conversation, Message } from "../types";

const STORAGE_VERSION = 1;
const FILE_NAME = "conversations.json";
const BACKUP_FILE_NAME = "conversations.json.bak";
const TEMP_FILE_NAME = "conversations.json.tmp";

interface PersistedConversations {
  version: number;
  updatedAt: number;
  conversations: Conversation[];
}

export class ConversationStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConversationStorageError";
  }
}

let writeQueue: Promise<void> = Promise.resolve();

export function getConversationsPath(): string {
  return path.join(environment.supportPath, FILE_NAME);
}

export async function loadConversations(): Promise<Conversation[]> {
  const filePath = getConversationsPath();
  let raw: string;

  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }

    throw new ConversationStorageError(`Failed to load conversation history: ${getErrorMessage(error)}`);
  }

  try {
    return parsePersistedConversations(raw).conversations;
  } catch (mainError) {
    try {
      const backupRaw = await fs.readFile(getBackupPath(), "utf8");
      return parsePersistedConversations(backupRaw).conversations;
    } catch {
      throw new ConversationStorageError(`Failed to parse conversation history: ${getErrorMessage(mainError)}`);
    }
  }
}

export function loadConversationsSync(): Conversation[] {
  const filePath = getConversationsPath();
  let raw: string;

  try {
    raw = fsSync.readFileSync(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }
    throw new ConversationStorageError(`Failed to load conversation history: ${getErrorMessage(error)}`);
  }

  try {
    return parsePersistedConversations(raw).conversations;
  } catch (mainError) {
    try {
      const backupRaw = fsSync.readFileSync(getBackupPath(), "utf8");
      return parsePersistedConversations(backupRaw).conversations;
    } catch {
      throw new ConversationStorageError(`Failed to parse conversation history: ${getErrorMessage(mainError)}`);
    }
  }
}

export function saveConversations(conversations: Conversation[]): Promise<void> {
  const task = writeQueue.then(() => writeConversations(conversations));
  writeQueue = task.catch(() => undefined);
  return task;
}

async function writeConversations(conversations: Conversation[]): Promise<void> {
  const directory = environment.supportPath;
  const filePath = getConversationsPath();
  const backupPath = getBackupPath();
  const tempPath = path.join(directory, TEMP_FILE_NAME);
  const raw = JSON.stringify(
    {
      version: STORAGE_VERSION,
      updatedAt: Date.now(),
      conversations,
    } satisfies PersistedConversations,
    null,
    2,
  );

  parsePersistedConversations(raw);

  try {
    await fs.mkdir(directory, { recursive: true });

    await fs.writeFile(tempPath, raw, "utf8");
    await fs.rename(tempPath, filePath);

    await fs.copyFile(filePath, backupPath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => undefined);
    throw new ConversationStorageError(`Failed to save conversation history: ${getErrorMessage(error)}`);
  }
}

function getBackupPath(): string {
  return path.join(environment.supportPath, BACKUP_FILE_NAME);
}

function parsePersistedConversations(raw: string): PersistedConversations {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Failed to parse JSON");
  }

  if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.conversations)) {
    throw new Error("Conversation history has an invalid structure or unsupported version");
  }

  if (!parsed.conversations.every(isConversation)) {
    throw new Error("Conversation history contains an invalid conversation");
  }

  return {
    version: STORAGE_VERSION,
    updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    conversations: parsed.conversations,
  };
}

function isConversation(value: unknown): value is Conversation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.title === "string" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number" &&
    Array.isArray(value.messages) &&
    value.messages.every(isMessage)
  );
}

function isMessage(value: unknown): value is Message {
  if (!isRecord(value)) {
    return false;
  }

  const roleOk = value.role === "user" || value.role === "assistant";
  const optionalNumberOk = value.tokens === undefined || typeof value.tokens === "number";
  const optionalStringOk = value.modelName === undefined || typeof value.modelName === "string";
  const statusOk = isMessageStatus(value.status);

  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    roleOk &&
    typeof value.content === "string" &&
    typeof value.createdAt === "number" &&
    optionalNumberOk &&
    optionalStringOk &&
    statusOk
  );
}

function isMessageStatus(value: unknown): boolean {
  return (
    value === undefined ||
    value === "streaming" ||
    value === "done" ||
    value === "cancelled" ||
    value === "error" ||
    value === "interrupted"
  );
}
