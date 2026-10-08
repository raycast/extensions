import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ChatMessage } from "./transcript";

export interface Chat {
  id: string;
  title: string;
  instructions: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  /** A message that was waiting to be sent when the chat closed. It is put back in the input when the chat opens. */
  draft?: string;
}

const TITLE_LENGTH = 60;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function chatTitle(firstMessage: string): string {
  const line = firstMessage.replace(/\s+/g, " ").trim();
  return line.length > TITLE_LENGTH ? `${line.slice(0, TITLE_LENGTH - 1)}…` : line || "New Chat";
}

function isMessage(value: unknown): value is ChatMessage {
  const message = value as ChatMessage;
  return (
    typeof message === "object" &&
    message !== null &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  );
}

/** Checks a parsed file and fills in fields that are missing, so one bad file cannot break the list. */
export function toChat(id: string, value: unknown): Chat | undefined {
  const data = value as Partial<Chat>;
  if (typeof data !== "object" || data === null || !Array.isArray(data.messages)) return undefined;
  const messages = data.messages.filter(isMessage).map((message) => ({
    role: message.role,
    content: message.content,
    createdAt: typeof message.createdAt === "string" ? message.createdAt : "",
  }));
  const fallbackDate = new Date(0).toISOString();
  return {
    id,
    title: typeof data.title === "string" && data.title.trim() ? data.title : "Untitled Chat",
    instructions: typeof data.instructions === "string" ? data.instructions : "",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : fallbackDate,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : fallbackDate,
    messages,
    ...(typeof data.draft === "string" && data.draft.trim() ? { draft: data.draft } : {}),
  };
}

/** Chats are plain JSON files in the extension's support folder, one file per chat, named by its id. */
export class ChatStore {
  constructor(private readonly directory: string) {}

  private file(id: string) {
    // The id becomes a file name, so only accept the ids this store creates.
    if (!ID_PATTERN.test(id)) throw new Error(`Invalid chat id: ${id}`);
    return join(this.directory, `${id}.json`);
  }

  async list(): Promise<Chat[]> {
    await mkdir(this.directory, { recursive: true });
    const ids = (await readdir(this.directory))
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.slice(0, -".json".length))
      .filter((id) => ID_PATTERN.test(id));
    const chats = await Promise.all(ids.map((id) => this.get(id)));
    return chats
      .filter((chat): chat is Chat => chat !== undefined)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<Chat | undefined> {
    if (!ID_PATTERN.test(id)) return undefined;
    try {
      return toChat(id, JSON.parse(await readFile(this.file(id), "utf8")));
    } catch {
      return undefined;
    }
  }

  create(instructions: string, messages: ChatMessage[] = []): Chat {
    const now = new Date().toISOString();
    const firstUserMessage = messages.find((message) => message.role === "user");
    return {
      id: randomUUID(),
      title: firstUserMessage ? chatTitle(firstUserMessage.content) : "New Chat",
      instructions,
      createdAt: now,
      updatedAt: now,
      messages,
    };
  }

  async save(chat: Chat): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.file(chat.id), JSON.stringify(chat, null, 2), "utf8");
  }

  async delete(id: string): Promise<void> {
    await rm(this.file(id), { force: true });
  }
}
