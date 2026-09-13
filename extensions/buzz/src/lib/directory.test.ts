import { describe, it, expect, vi } from "vitest";
import { shortenPubkey, profileName, toPerson, newestPerAuthor, searchPeople } from "./directory";
import type { NostrEvent } from "./types";

function event(overrides: Partial<NostrEvent> = {}): NostrEvent {
  return {
    id: "event-id",
    pubkey: "a".repeat(64),
    created_at: 1000,
    kind: 0,
    tags: [],
    content: "{}",
    sig: "sig",
    ...overrides,
  };
}

describe("shortenPubkey", () => {
  it("keeps the first eight characters", () => {
    expect(shortenPubkey("0123456789abcdef".repeat(4))).toBe("01234567");
  });

  it("returns a short pubkey unchanged", () => {
    expect(shortenPubkey("abc")).toBe("abc");
  });
});

describe("profileName", () => {
  it("prefers display_name over name", () => {
    expect(profileName('{"display_name":"Carlos Sol","name":"caasols"}')).toBe("Carlos Sol");
  });

  it("falls back to name when display_name is absent", () => {
    expect(profileName('{"name":"caasols"}')).toBe("caasols");
  });

  it("falls back to name when display_name is blank", () => {
    expect(profileName('{"display_name":"   ","name":"caasols"}')).toBe("caasols");
  });

  it("trims surrounding whitespace", () => {
    expect(profileName('{"display_name":"  Carlos  "}')).toBe("Carlos");
  });

  it("returns an empty string for malformed JSON", () => {
    expect(profileName("not json")).toBe("");
  });

  it("returns an empty string when neither field is present", () => {
    expect(profileName('{"about":"hello"}')).toBe("");
  });

  it("returns an empty string when the fields are not strings", () => {
    expect(profileName('{"display_name":7,"name":false}')).toBe("");
  });

  it("returns an empty string when the content is not an object", () => {
    expect(profileName("[1,2]")).toBe("");
    expect(profileName("null")).toBe("");
  });
});

describe("toPerson", () => {
  it("uses the profile name when there is one", () => {
    const person = toPerson(event({ pubkey: "b".repeat(64), content: '{"name":"agent-smith"}' }));
    expect(person).toEqual({ pubkey: "b".repeat(64), name: "agent-smith" });
  });

  it("falls back to a shortened pubkey when the profile has no name", () => {
    const person = toPerson(event({ pubkey: "cdef".repeat(16), content: "{}" }));
    expect(person).toEqual({ pubkey: "cdef".repeat(16), name: "cdefcdef" });
  });
});

describe("newestPerAuthor", () => {
  it("keeps only the newest event for each author", () => {
    const kept = newestPerAuthor([
      event({ id: "old", pubkey: "aa", created_at: 100 }),
      event({ id: "new", pubkey: "aa", created_at: 200 }),
      event({ id: "other", pubkey: "bb", created_at: 50 }),
    ]);
    expect(kept.map((e) => e.id)).toEqual(["new", "other"]);
  });

  it("keeps the first seen when timestamps tie", () => {
    const kept = newestPerAuthor([
      event({ id: "first", pubkey: "aa", created_at: 100 }),
      event({ id: "second", pubkey: "aa", created_at: 100 }),
    ]);
    expect(kept.map((e) => e.id)).toEqual(["first"]);
  });

  it("returns an empty array for no events", () => {
    expect(newestPerAuthor([])).toEqual([]);
  });
});

describe("searchPeople", () => {
  it("issues a NIP-50 search over kind:0 and maps the results", async () => {
    const query = vi.fn(async () => [
      event({ pubkey: "11".repeat(32), content: '{"display_name":"Ada"}' }),
      event({ pubkey: "22".repeat(32), content: '{"name":"bot"}' }),
    ]);
    const people = await searchPeople({ query }, "ad");

    expect(query).toHaveBeenCalledWith([{ kinds: [0], search: "ad", limit: 20 }]);
    expect(people).toEqual([
      { pubkey: "11".repeat(32), name: "Ada" },
      { pubkey: "22".repeat(32), name: "bot" },
    ]);
  });

  it("trims the query before searching", async () => {
    const query = vi.fn(async () => []);
    await searchPeople({ query }, "  ada  ");
    expect(query).toHaveBeenCalledWith([{ kinds: [0], search: "ada", limit: 20 }]);
  });

  it("honours an explicit limit", async () => {
    const query = vi.fn(async () => []);
    await searchPeople({ query }, "ada", 5);
    expect(query).toHaveBeenCalledWith([{ kinds: [0], search: "ada", limit: 5 }]);
  });

  it("does not query at all for an empty or blank query", async () => {
    const query = vi.fn(async () => [event()]);
    expect(await searchPeople({ query }, "")).toEqual([]);
    expect(await searchPeople({ query }, "   ")).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });

  it("collapses duplicate profiles for the same author, newest winning", async () => {
    const query = vi.fn(async () => [
      event({ pubkey: "33".repeat(32), created_at: 10, content: '{"name":"old-name"}' }),
      event({ pubkey: "33".repeat(32), created_at: 20, content: '{"name":"new-name"}' }),
    ]);
    const people = await searchPeople({ query }, "name");
    expect(people).toEqual([{ pubkey: "33".repeat(32), name: "new-name" }]);
  });
});
