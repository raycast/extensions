import { afterEach, vi } from "vitest";
import * as api from "../api";
import type { User } from "../api";
import { formatUser, matchUser, resolveAssignees } from "./assignees";

function user(overrides: Partial<User> & { id: number }): User {
  return {
    username: `user${overrides.id}`,
    name: "",
    email: `user${overrides.id}@example.com`,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("matchUser", () => {
  it("returns undefined for no candidates", () => {
    expect(matchUser([], "alice")).toBeUndefined();
  });

  describe("with a single candidate (strict matching)", () => {
    it("matches an exact username", () => {
      const alice = user({ id: 1, username: "alice" });
      expect(matchUser([alice], "alice")).toBe(alice);
    });

    it("ignores case", () => {
      const alice = user({ id: 1, username: "Alice" });
      expect(matchUser([alice], "alice")).toBe(alice);
    });

    it("rejects a partial username so the wrong person is never bound", () => {
      const alice = user({ id: 1, username: "alexandra" });
      expect(matchUser([alice], "alex")).toBeUndefined();
    });

    it("falls back to an exact display name", () => {
      const jane = user({ id: 1, username: "jdoe", name: "Jane Doe" });
      expect(matchUser([jane], "Jane Doe")).toBe(jane);
    });

    it("falls back to an exact email", () => {
      const bob = user({ id: 1, username: "bob", email: "b@corp.com" });
      expect(matchUser([bob], "b@corp.com")).toBe(bob);
    });
  });

  describe("with multiple candidates (fuzzy matching)", () => {
    it("allows a partial username", () => {
      const users = [
        user({ id: 1, username: "alexandra" }),
        user({ id: 2, username: "bob" }),
      ];
      expect(matchUser(users, "alex")?.id).toBe(1);
    });

    it("prefers a username match over a name match", () => {
      const users = [
        user({ id: 1, username: "someone", name: "alice smith" }),
        user({ id: 2, username: "alice" }),
      ];
      expect(matchUser(users, "alice")?.id).toBe(2);
    });

    it("returns undefined when nothing contains the query", () => {
      const users = [
        user({ id: 1, username: "bob" }),
        user({ id: 2, username: "carol" }),
      ];
      expect(matchUser(users, "zzz")).toBeUndefined();
    });
  });
});

describe("resolveAssignees", () => {
  it("skips the lookup entirely for no names", async () => {
    const spy = vi.spyOn(api, "getProjectUsers");
    const result = await resolveAssignees([], 1);

    expect(result).toEqual({
      matched: [],
      matchedNames: [],
      unmatchedNames: [],
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("resolves a matching member", async () => {
    const alice = user({ id: 7, username: "alice" });
    vi.spyOn(api, "getProjectUsers").mockResolvedValue([alice]);

    const result = await resolveAssignees(["alice"], 1);

    expect(result.matched).toEqual([alice]);
    expect(result.matchedNames).toEqual(["alice"]);
    expect(result.unmatchedNames).toEqual([]);
  });

  it("reports a name with no matching member", async () => {
    vi.spyOn(api, "getProjectUsers").mockResolvedValue([]);

    const result = await resolveAssignees(["ghost"], 1);

    expect(result.matched).toEqual([]);
    expect(result.unmatchedNames).toEqual(["ghost"]);
  });

  it("separates matched from unmatched names", async () => {
    const alice = user({ id: 7, username: "alice" });
    vi.spyOn(api, "getProjectUsers").mockImplementation(async (_, search) =>
      search === "alice" ? [alice] : [],
    );

    const result = await resolveAssignees(["alice", "ghost"], 1);

    expect(result.matchedNames).toEqual(["alice"]);
    expect(result.unmatchedNames).toEqual(["ghost"]);
  });

  it("treats a failed lookup as not found rather than throwing", async () => {
    vi.spyOn(api, "getProjectUsers").mockRejectedValue(new Error("boom"));

    const result = await resolveAssignees(["alice"], 1);

    expect(result.matched).toEqual([]);
    expect(result.unmatchedNames).toEqual(["alice"]);
  });

  it("deduplicates when two names resolve to the same user", async () => {
    const alice = user({ id: 7, username: "alice", email: "a@corp.com" });
    vi.spyOn(api, "getProjectUsers").mockResolvedValue([alice]);

    const result = await resolveAssignees(["alice", "a@corp.com"], 1);

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].id).toBe(7);
  });

  it("queries once per name against the given project", async () => {
    const spy = vi.spyOn(api, "getProjectUsers").mockResolvedValue([]);

    await resolveAssignees(["a", "b"], 42);

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(42, "a");
    expect(spy).toHaveBeenCalledWith(42, "b");
  });
});

describe("formatUser", () => {
  it("prefers the display name", () => {
    expect(formatUser(user({ id: 1, username: "jdoe", name: "Jane" }))).toBe(
      "Jane",
    );
  });

  it("falls back to the username when the name is blank", () => {
    expect(formatUser(user({ id: 1, username: "jdoe", name: "   " }))).toBe(
      "jdoe",
    );
  });
});
