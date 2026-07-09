import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: async (key: string) => store.get(key),
    setItem: async (key: string, value: string) => void store.set(key, value),
    removeItem: async (key: string) => void store.delete(key),
  },
}));

import {
  createChat,
  deleteChat,
  deriveTitle,
  getChat,
  listChats,
  saveChat,
} from "../src/lib/storage";

beforeEach(() => store.clear());

describe("deriveTitle", () => {
  it("collapses whitespace and trims", () => {
    expect(deriveTitle("  hello\n  world  ")).toBe("hello world");
  });

  it("truncates long messages to 50 chars with ellipsis", () => {
    const title = deriveTitle("x".repeat(80));
    expect(title).toBe("x".repeat(50) + "…");
  });

  it("falls back to 'New Chat' for empty input", () => {
    expect(deriveTitle("   ")).toBe("New Chat");
  });
});

describe("chat CRUD", () => {
  it("createChat persists an empty chat retrievable by id", async () => {
    const chat = await createChat("some-model");
    expect(chat.messages).toEqual([]);
    expect(chat.model).toBe("some-model");
    expect(chat.title).toBe("New Chat");
    expect(await getChat(chat.id)).toEqual(chat);
  });

  it("saveChat upserts and refreshes updatedAt", async () => {
    const chat = await createChat("m");
    const before = chat.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await saveChat({ ...chat, title: "Renamed" });
    const loaded = await getChat(chat.id);
    expect(loaded?.title).toBe("Renamed");
    expect(loaded!.updatedAt).toBeGreaterThan(before);
  });

  it("listChats returns chats sorted by updatedAt desc", async () => {
    const a = await createChat("m");
    await new Promise((r) => setTimeout(r, 5));
    const b = await createChat("m");
    await new Promise((r) => setTimeout(r, 5));
    await saveChat(a); // touch a -> most recent
    const ids = (await listChats()).map((c) => c.id);
    expect(ids).toEqual([a.id, b.id]);
  });

  it("deleteChat removes the chat", async () => {
    const chat = await createChat("m");
    await deleteChat(chat.id);
    expect(await getChat(chat.id)).toBeUndefined();
    expect(await listChats()).toEqual([]);
  });

  it("listChats returns [] when storage is empty or corrupt", async () => {
    expect(await listChats()).toEqual([]);
    store.set("chats", "not json{{");
    expect(await listChats()).toEqual([]);
  });
});
