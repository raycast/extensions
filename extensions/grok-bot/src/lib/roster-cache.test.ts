import { beforeEach, describe, expect, it } from "vitest";
import { readCachedBots, writeCachedBots, writeCachedBotsIfEmpty } from "./roster-cache";
import { Bot, parseAgentId } from "./types";

function bot(overrides: { id: string; name: string } & Partial<Omit<Bot, "id" | "name">>): Bot {
  const id = parseAgentId(overrides.id);
  if (!id.ok) {
    throw new Error("invalid test id");
  }
  return {
    id: id.value,
    name: overrides.name,
    title: overrides.title ?? "",
    description: overrides.description ?? "",
    isGroup: overrides.isGroup ?? false,
    isHidden: overrides.isHidden ?? false,
    status: overrides.status ?? { kind: "idle" },
    lastPreview: overrides.lastPreview ?? null,
    avatarColor: overrides.avatarColor ?? null,
    avatarHash: overrides.avatarHash ?? null,
  };
}

const piper = bot({ id: "a1", name: "Piper", avatarHash: "abcabcabcabcabca" });
const scout = bot({ id: "a2", name: "Scout" });

describe("writeCachedBotsIfEmpty", () => {
  beforeEach(() => {
    writeCachedBots([]);
  });

  it("writes when the cache is empty", () => {
    writeCachedBotsIfEmpty([scout]);
    expect(readCachedBots()).toEqual([scout]);
  });

  it("does not replace a roster that already has avatar hashes", () => {
    writeCachedBots([piper]);
    writeCachedBotsIfEmpty([scout]);
    expect(readCachedBots()).toEqual([piper]);
  });
});
