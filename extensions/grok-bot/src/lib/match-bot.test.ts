import { describe, expect, it } from "vitest";
import {
  filterBotsForList,
  groupBotsForDropdown,
  matchBotForSend,
  resolveInitialBot,
  unmatchedSendMessage,
} from "./match-bot";
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

const piper = bot({ id: "a1", name: "Piper", title: "Engineer", description: "Builds things" });
const scout = bot({ id: "a2", name: "Scout", isHidden: true, description: "Finds talent" });
const crew = bot({ id: "g1", name: "Launch", isGroup: true });
const maya = bot({ id: "a3", name: "Maya" });
const dana = bot({ id: "a4", name: "Dana" });
const pi = bot({ id: "a5", name: "Pi" });

describe("matchBotForSend", () => {
  it("matches exact id or exact name before a substring", () => {
    const bots = [piper, scout, pi];
    expect(matchBotForSend(bots, "Piper")).toEqual({ kind: "matched", bot: piper });
    expect(matchBotForSend(bots, "a1")).toEqual({ kind: "matched", bot: piper });
    expect(matchBotForSend(bots, "Pi")).toEqual({ kind: "matched", bot: pi });
  });

  it("matches a unique name or title substring", () => {
    expect(matchBotForSend([piper, scout], "Pi")).toEqual({ kind: "matched", bot: piper });
    expect(matchBotForSend([piper, scout], "engine")).toEqual({ kind: "matched", bot: piper });
  });

  it("returns ambiguous when a substring hits two names", () => {
    expect(matchBotForSend([maya, dana], "a")).toEqual({ kind: "ambiguous", candidates: [maya, dana] });
  });
});

describe("unmatchedSendMessage", () => {
  it("lists candidate names, or points at list-bots", () => {
    expect(unmatchedSendMessage("a", { kind: "ambiguous", candidates: [maya, dana] })).toBe(
      'No bot matched "a". Candidates: Maya, Dana.',
    );
    expect(unmatchedSendMessage("zzz", { kind: "none" })).toBe('No bot matched "zzz". Use list-bots to see teammates.');
  });
});

function favoriteIds(...raw: string[]) {
  return raw.map((value) => {
    const parsed = parseAgentId(value);
    if (!parsed.ok) {
      throw new Error("invalid favorite id");
    }
    return parsed.value;
  });
}

describe("filterBotsForList", () => {
  it("hides hidden bots until there is a search query", () => {
    const empty = filterBotsForList({ bots: [piper, scout, crew], query: "" });
    expect(empty.favorites).toEqual([]);
    expect(empty.individuals.map((entry) => entry.name)).toEqual(["Piper"]);
    expect(empty.groups.map((entry) => entry.name)).toEqual(["Launch"]);
    expect(empty.hidden).toEqual([]);

    const searched = filterBotsForList({ bots: [piper, scout, crew], query: "talent" });
    expect(searched.favorites).toEqual([]);
    expect(searched.individuals).toEqual([]);
    expect(searched.hidden.map((entry) => entry.name)).toEqual(["Scout"]);
  });

  it("lists favorites in pin order, not roster order", () => {
    const grouped = filterBotsForList({
      bots: [piper, maya, scout],
      query: "",
      favoriteIds: favoriteIds("a3", "a1"),
    });
    expect(grouped.favorites.map((entry) => entry.name)).toEqual(["Maya", "Piper"]);
    expect(grouped.individuals).toEqual([]);
  });

  it("shows a pinned hidden bot in favorites and not in hidden with an empty query", () => {
    const grouped = filterBotsForList({
      bots: [piper, scout, crew],
      query: "",
      favoriteIds: favoriteIds("a2"),
    });
    expect(grouped.favorites.map((entry) => entry.name)).toEqual(["Scout"]);
    expect(grouped.hidden).toEqual([]);
  });

  it("keeps a pinned individual out of individuals", () => {
    const grouped = filterBotsForList({
      bots: [piper, maya],
      query: "",
      favoriteIds: favoriteIds("a1"),
    });
    expect(grouped.favorites.map((entry) => entry.name)).toEqual(["Piper"]);
    expect(grouped.individuals.map((entry) => entry.name)).toEqual(["Maya"]);
  });

  it("excludes a favorite from favorites when the search query does not match it", () => {
    const grouped = filterBotsForList({
      bots: [piper, scout],
      query: "talent",
      favoriteIds: favoriteIds("a1", "a2"),
    });
    expect(grouped.favorites.map((entry) => entry.name)).toEqual(["Scout"]);
    expect(grouped.individuals).toEqual([]);
  });
});

describe("groupBotsForDropdown", () => {
  it("lists unfavorited hidden bots in hidden when favorites are empty", () => {
    const grouped = groupBotsForDropdown({ bots: [piper, scout, crew] });
    expect(grouped.favorites).toEqual([]);
    expect(grouped.hidden.map((entry) => entry.name)).toEqual(["Scout"]);
  });

  it("moves a hidden favorite into favorites and out of hidden", () => {
    const grouped = groupBotsForDropdown({
      bots: [piper, scout, crew],
      favoriteIds: favoriteIds("a2"),
    });
    expect(grouped.favorites.map((entry) => entry.name)).toEqual(["Scout"]);
    expect(grouped.hidden).toEqual([]);
    expect(grouped.individuals.map((entry) => entry.name)).toEqual(["Piper"]);
  });
});

describe("resolveInitialBot", () => {
  it("prefers a unique query, then last id, then first bot", () => {
    const last = parseAgentId("a2");
    if (!last.ok) {
      throw new Error("invalid last id");
    }
    const bots = [piper, scout];
    expect(resolveInitialBot({ bots, query: "Scout", lastId: last.value })?.name).toBe("Scout");
    expect(resolveInitialBot({ bots, query: "Pi", lastId: last.value })?.name).toBe("Piper");
    expect(resolveInitialBot({ bots, lastId: last.value })?.name).toBe("Scout");
    expect(resolveInitialBot({ bots, lastId: null })?.name).toBe("Piper");
  });

  it("falls through when the query is ambiguous", () => {
    const last = parseAgentId("a2");
    if (!last.ok) {
      throw new Error("invalid last id");
    }
    expect(resolveInitialBot({ bots: [maya, dana, scout], query: "a", lastId: last.value })?.name).toBe("Scout");
  });
});
