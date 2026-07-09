import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { Chat } from "./types";

const CHATS_KEY = "chats";
const TITLE_MAX = 50;

export function deriveTitle(firstMessage: string): string {
  const collapsed = firstMessage.replace(/\s+/g, " ").trim();
  if (!collapsed) return "New Chat";
  return collapsed.length > TITLE_MAX
    ? collapsed.slice(0, TITLE_MAX) + "…"
    : collapsed;
}

async function readChats(): Promise<Chat[]> {
  const raw = await LocalStorage.getItem<string>(CHATS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Chat[]) : [];
  } catch {
    return [];
  }
}

async function writeChats(chats: Chat[]): Promise<void> {
  await LocalStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

export async function listChats(): Promise<Chat[]> {
  const chats = await readChats();
  return chats.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getChat(id: string): Promise<Chat | undefined> {
  return (await readChats()).find((c) => c.id === id);
}

export async function saveChat(chat: Chat): Promise<void> {
  const chats = await readChats();
  const updated: Chat = { ...chat, updatedAt: Date.now() };
  const index = chats.findIndex((c) => c.id === chat.id);
  if (index >= 0) chats[index] = updated;
  else chats.push(updated);
  await writeChats(chats);
}

export async function deleteChat(id: string): Promise<void> {
  await writeChats((await readChats()).filter((c) => c.id !== id));
}

export async function createChat(model: string): Promise<Chat> {
  const now = Date.now();
  const chat: Chat = {
    id: randomUUID(),
    title: "New Chat",
    model,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  const chats = await readChats();
  chats.push(chat);
  await writeChats(chats);
  return chat;
}
