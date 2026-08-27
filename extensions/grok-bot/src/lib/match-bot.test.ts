import { describe, expect, it } from "vitest";
import { filterBotsForList, matchBotForSend, resolveInitialBot, unmatchedSendMessage } from "./match-bot";
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

describe("filterBotsForList", () => {
  it("hides hidden bots until there is a search query", () => {
    const empty = filterBotsForList([piper, scout, crew], "");
    expect(empty.individuals.map((entry) => entry.name)).toEqual(["Piper"]);
    expect(empty.groups.map((entry) => entry.name)).toEqual(["Launch"]);
    expect(empty.hidden).toEqual([]);

    const searched = filterBotsForList([piper, scout, crew], "talent");
    expect(searched.individuals).toEqual([]);
    expect(searched.hidden.map((entry) => entry.name)).toEqual(["Scout"]);
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
