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
  saveChat,
  upsertChat,
} from "../src/lib/chat-store";
import { Video } from "../src/types";
import { videoToLink } from "../src/lib/sources/video";

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
  it("keeps the key chats about videos were saved under, so they still open", () => {
    const video = { id: "abc", extractor_key: "Youtube", title: "T", duration: 1, formats: [] } as Video;
    expect(chatKey(videoToLink("https://youtu.be/abc", video, { segments: [] }))).toBe("youtube:abc");
    expect(chatKey(videoToLink("https://www.youtube.com/watch?v=abc&t=5", video, { segments: [] }))).toBe(
      "youtube:abc",
    );
  });

  it("uses whatever key the link's reader chose", () => {
    expect(chatKey({ key: "instagram:DdHyaYAifb6" })).toBe("instagram:DdHyaYAifb6");
    expect(chatKey({ key: "https://example.com/a" })).toBe("https://example.com/a");
  });
});

describe("stored chats from before Chat About Link", () => {
  it("still parse, and count as videos", () => {
    const old = { key: "youtube:abc", url: "https://youtu.be/abc", title: "T", updatedAt: 1, turns: [] };
    const [chat] = parseChats(JSON.stringify([old]));
    expect(chat).toMatchObject(old);
    expect(chat.kind ?? "video").toBe("video");
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

describe("upsertChat", () => {
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

  it("keeps a chat, and fails the deletion, when its deletion can't be noted", async () => {
    // Without the note, a save's pending check (maybe in another command) would
    // take the deletion for a lost write and bring the chat back.
    await saveChat(chat("kept", 10));
    const real = LocalStorage.setItem.bind(LocalStorage);
    const spy = vi.spyOn(LocalStorage, "setItem").mockImplementation(async (key: string, value: string) => {
      if (key === "video-chats-deleted-v1") throw new Error("disk full");
      return real(key, value);
    });
    try {
      await expect(deleteChat("kept")).rejects.toThrow(/disk full/);
      expect((await findChat("kept"))?.title).toBe("kept");
    } finally {
      spy.mockRestore();
    }
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

  it("keeps a chat deleted while its save is still being checked", async () => {
    vi.useFakeTimers();
    await saveChat(chat("gone", Date.now()));
    await vi.advanceTimersByTimeAsync(400);
    await deleteChat("gone"); // e.g. from the start screen, in another command
    await vi.advanceTimersByTimeAsync(200); // the save's check runs at 500 ms
    expect(await findChat("gone")).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1_500);
    expect(await findChat("gone")).toBeUndefined();
  });

  it("keeps a chat started again right after it was deleted", async () => {
    vi.useFakeTimers();
    await saveChat(chat("again", Date.now()));
    await deleteChat("again");
    await vi.advanceTimersByTimeAsync(10);
    await saveChat(chat("again", Date.now(), 2));
    // The deletion's check (at 500 ms) runs before the new save's (at 510 ms) and must not remove it.
    await vi.advanceTimersByTimeAsync(495);
    expect((await findChat("again"))?.turns).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1_500);
    expect((await findChat("again"))?.turns).toHaveLength(2);
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
