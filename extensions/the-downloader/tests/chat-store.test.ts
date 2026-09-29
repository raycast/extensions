import { describe, it, expect, vi, afterEach } from "vitest";
import { LocalStorage } from "@raycast/api";
import {
  CHAT_LIMIT,
  StoredChat,
  TURN_LIMIT,
  chatKey,
  deleteChat,
  findChat,
  loadChats,
  parseChats,
  removeChat,
  saveChat,
  upsertChat,
} from "../src/lib/chat-store";
import { Video } from "../src/types";

function chat(key: string, updatedAt: number, turns = 1): StoredChat {
  return {
    key,
    url: `https://example.com/${key}`,
    title: key,
    updatedAt,
    turns: Array.from({ length: turns }, (_, i) => ({ question: `q${i}`, answer: `a${i}` })),
  };
}

describe("chatKey", () => {
  it("uses the site and video ID, so different URLs for one video share a chat", () => {
    const video = { id: "abc", extractor_key: "Youtube", title: "T" } as Video;
    expect(chatKey({ url: "https://youtu.be/abc", video })).toBe("youtube:abc");
    expect(chatKey({ url: "https://www.youtube.com/watch?v=abc&t=5", video })).toBe("youtube:abc");
  });

  it("falls back to the URL", () => {
    expect(chatKey({ url: "https://example.com/v", video: { title: "T" } as Video })).toBe("https://example.com/v");
  });
});

describe("parseChats", () => {
  it("keeps valid chats and drops malformed ones", () => {
    const raw = JSON.stringify([chat("a", 1), { key: "b" }, { ...chat("c", 2), turns: [{ question: 1 }] }]);
    expect(parseChats(raw).map((c) => c.key)).toEqual(["a"]);
  });

  it("returns an empty list for missing or corrupt data", () => {
    expect(parseChats(undefined)).toEqual([]);
    expect(parseChats("{nope")).toEqual([]);
    expect(parseChats('{"a":1}')).toEqual([]);
  });
});

describe("upsertChat / removeChat", () => {
  it("replaces the chat with the same key and sorts newest first", () => {
    const list = [chat("a", 3), chat("b", 2)];
    const next = upsertChat(list, chat("b", 5, 2));
    expect(next.map((c) => c.key)).toEqual(["b", "a"]);
    expect(next[0].turns).toHaveLength(2);
  });

  it("keeps at most CHAT_LIMIT chats and TURN_LIMIT turns", () => {
    const many = Array.from({ length: CHAT_LIMIT }, (_, i) => chat(`c${i}`, i));
    const next = upsertChat(many, chat("new", 1_000, TURN_LIMIT + 5));
    expect(next).toHaveLength(CHAT_LIMIT);
    expect(next[0].key).toBe("new");
    expect(next[0].turns).toHaveLength(TURN_LIMIT);
    expect(next[0].turns[0].question).toBe("q5");
    expect(next.some((c) => c.key === "c0")).toBe(false);
  });

  it("removes by key", () => {
    expect(removeChat([chat("a", 1), chat("b", 2)], "a").map((c) => c.key)).toEqual(["b"]);
  });
});

describe("storage", () => {
  it("saves, finds and deletes chats", async () => {
    await saveChat(chat("x", 10));
    await saveChat(chat("y", 20));
    expect((await loadChats()).map((c) => c.key)).toEqual(["y", "x"]);
    expect((await findChat("x"))?.title).toBe("x");
    await deleteChat("x");
    expect(await findChat("x")).toBeUndefined();
    expect((await loadChats()).map((c) => c.key)).toEqual(["y"]);
  });
});

describe("concurrent writes from another command", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("re-applies a save that another command's write replaced", async () => {
    vi.useFakeTimers();
    await saveChat(chat("mine", 100));
    // Another command writes its own list, without our chat, right after ours.
    await LocalStorage.setItem("video-chats-v1", JSON.stringify([chat("theirs", 50)]));
    await vi.advanceTimersByTimeAsync(600);
    expect((await loadChats()).map((c) => c.key)).toEqual(["mine", "theirs"]);
  });

  it("leaves a newer save of the same chat alone", async () => {
    vi.useFakeTimers();
    await saveChat(chat("same", 100, 1));
    await LocalStorage.setItem("video-chats-v1", JSON.stringify([chat("same", 200, 3)]));
    await vi.advanceTimersByTimeAsync(600);
    const [stored] = await loadChats();
    expect(stored.updatedAt).toBe(200);
    expect(stored.turns).toHaveLength(3);
  });
});
