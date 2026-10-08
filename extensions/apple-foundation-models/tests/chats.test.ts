import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chatTitle, ChatStore } from "../src/lib/chats";
import { toTurns } from "../src/lib/turns";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "afm-chats-"));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("ChatStore", () => {
  it("saves, lists newest first, reads and deletes chats", async () => {
    const store = new ChatStore(directory);
    const older = { ...store.create("Be brief."), updatedAt: "2026-10-01T00:00:00.000Z" };
    const newer = { ...store.create("Be brief."), updatedAt: "2026-10-08T00:00:00.000Z" };
    await store.save(older);
    await store.save(newer);
    expect((await store.list()).map((chat) => chat.id)).toEqual([newer.id, older.id]);
    expect(await store.get(older.id)).toEqual(older);
    await store.delete(older.id);
    expect((await store.list()).map((chat) => chat.id)).toEqual([newer.id]);
  });

  it("titles a chat after its first question", () => {
    const store = new ChatStore(directory);
    const chat = store.create("", [{ role: "user", content: "What is DNS?", createdAt: "x" }]);
    expect(chat.title).toBe("What is DNS?");
  });

  it("skips broken files and files that are not chats", async () => {
    await writeFile(join(directory, "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b.json"), "{ not json", "utf8");
    await writeFile(join(directory, "notes.json"), "{}", "utf8");
    expect(await new ChatStore(directory).list()).toEqual([]);
  });

  it("names chats by the file name and fills in missing fields", async () => {
    const id = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
    await writeFile(
      join(directory, `${id}.json`),
      JSON.stringify({ id: "../other", messages: [{ role: "user", content: "Hi" }, { role: "tool" }] }),
      "utf8",
    );
    const chat = await new ChatStore(directory).get(id);
    expect(chat).toMatchObject({ id, title: "Untitled Chat", instructions: "" });
    expect(chat?.messages).toEqual([{ role: "user", content: "Hi", createdAt: "" }]);
  });

  it("keeps a waiting message as a draft, and ignores an empty one", async () => {
    const store = new ChatStore(directory);
    const chat = { ...store.create(""), draft: "Send this later" };
    await store.save(chat);
    expect((await store.get(chat.id))?.draft).toBe("Send this later");
    await store.save({ ...chat, draft: "  " });
    expect(await store.get(chat.id)).not.toHaveProperty("draft");
  });

  it("only accepts the ids it creates, so an id cannot point outside the folder", async () => {
    const store = new ChatStore(directory);
    expect(await store.get("../secrets")).toBeUndefined();
    await expect(store.save({ ...store.create(""), id: "../secrets" })).rejects.toThrow(/Invalid chat id/);
    await expect(store.delete("../secrets")).rejects.toThrow(/Invalid chat id/);
  });
});

describe("chatTitle", () => {
  it("uses one line and shortens long questions", () => {
    expect(chatTitle("Hello\n  world")).toBe("Hello world");
    expect(chatTitle("x".repeat(100))).toHaveLength(60);
    expect(chatTitle("   ")).toBe("New Chat");
  });
});

describe("toTurns", () => {
  it("pairs questions with answers, newest first", () => {
    const turns = toTurns([
      { role: "user", content: "q1", createdAt: "x" },
      { role: "assistant", content: "a1", createdAt: "x" },
      { role: "user", content: "q2", createdAt: "x" },
    ]);
    expect(turns.map((t) => [t.question, t.answer])).toEqual([
      ["q2", ""],
      ["q1", "a1"],
    ]);
  });
});
