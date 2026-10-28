import { describe, it, expect } from "vitest";
import { groupChatsByPinned } from "./chat";
import type { Chat } from "../services/telegram-client";

function chat(id: string, isPinned: boolean, date?: Date): Chat {
  return {
    id,
    title: id,
    type: "private",
    unreadCount: 0,
    isPinned,
    lastMessage: date ? { id: 1, text: "", date } : undefined,
  };
}

describe("groupChatsByPinned", () => {
  it("puts pinned chats first, each group newest first", () => {
    const groups = groupChatsByPinned([
      chat("old-pin", true, new Date("2024-01-01")),
      chat("recent", false, new Date("2024-03-01")),
      chat("new-pin", true, new Date("2024-02-01")),
      chat("stale", false, new Date("2024-01-15")),
    ]);

    expect(Array.from(groups.keys())).toEqual(["Pinned", "All Chats"]);
    expect(groups.get("Pinned")?.map((c) => c.id)).toEqual(["new-pin", "old-pin"]);
    expect(groups.get("All Chats")?.map((c) => c.id)).toEqual(["recent", "stale"]);
  });

  it("sorts chats with no last message to the end", () => {
    const groups = groupChatsByPinned([chat("silent", false), chat("spoken", false, new Date("2024-01-01"))]);

    expect(groups.get("All Chats")?.map((c) => c.id)).toEqual(["spoken", "silent"]);
  });

  it("omits a section that has no chats", () => {
    expect(Array.from(groupChatsByPinned([chat("a", false)]).keys())).toEqual(["All Chats"]);
    expect(Array.from(groupChatsByPinned([]).keys())).toEqual([]);
  });
});
