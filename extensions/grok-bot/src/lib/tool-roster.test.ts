import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Bot, parseAgentId } from "./types";

const { listAgents, readCachedBots, writeCachedBotsIfEmpty } = vi.hoisted(() => ({
  listAgents: vi.fn(),
  readCachedBots: vi.fn((): Bot[] => []),
  writeCachedBotsIfEmpty: vi.fn(),
}));

vi.mock("./gateway", () => ({
  listAgents,
}));

vi.mock("./roster-cache", () => ({
  readCachedBots,
  writeCachedBotsIfEmpty,
}));

import { loadToolRoster, resolveToolBot } from "./tool-roster";

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

const piper = bot({ id: "a1", name: "Piper" });
const scout = bot({ id: "a2", name: "Scout" });

describe("loadToolRoster", () => {
  beforeEach(() => {
    readCachedBots.mockReturnValue([]);
    listAgents.mockResolvedValue({ ok: true, value: [piper, scout] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached bots without fetching when the cache is warm", async () => {
    readCachedBots.mockReturnValue([piper]);

    const result = await loadToolRoster();

    expect(result).toEqual({ ok: true, value: [piper] });
    expect(listAgents).not.toHaveBeenCalled();
  });

  it("fetches with avatars skip and writes the cache on a cold start", async () => {
    const result = await loadToolRoster();

    expect(result).toEqual({ ok: true, value: [piper, scout] });
    expect(listAgents).toHaveBeenCalledWith({ avatars: "skip" });
    expect(writeCachedBotsIfEmpty).toHaveBeenCalledWith([piper, scout]);
  });
});

describe("resolveToolBot", () => {
  beforeEach(() => {
    readCachedBots.mockReturnValue([]);
    listAgents.mockResolvedValue({ ok: true, value: [piper, scout] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns a cached match without fetching", async () => {
    readCachedBots.mockReturnValue([piper, scout]);

    const target = await resolveToolBot("Piper");

    expect(target).toBe(piper);
    expect(listAgents).not.toHaveBeenCalled();
  });

  it("fetches when the cache is cold", async () => {
    const target = await resolveToolBot("Scout");

    expect(target).toBe(scout);
    expect(listAgents).toHaveBeenCalledWith({ avatars: "skip" });
    expect(writeCachedBotsIfEmpty).toHaveBeenCalledWith([piper, scout]);
  });

  it("fetches when the cache does not match the query", async () => {
    readCachedBots.mockReturnValue([piper]);

    const target = await resolveToolBot("Scout");

    expect(target).toBe(scout);
    expect(listAgents).toHaveBeenCalledWith({ avatars: "skip" });
    expect(writeCachedBotsIfEmpty).not.toHaveBeenCalled();
  });

  it("throws when fetch still does not match the query", async () => {
    readCachedBots.mockReturnValue([piper]);

    await expect(resolveToolBot("Unknown")).rejects.toThrow('No bot matched "Unknown"');
    expect(listAgents).toHaveBeenCalledWith({ avatars: "skip" });
    expect(writeCachedBotsIfEmpty).not.toHaveBeenCalled();
  });
});
