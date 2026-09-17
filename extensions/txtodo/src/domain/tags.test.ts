import { describe, expect, it } from "vitest";
import { parseLine } from "./parser";
import { currentPartialTag, matchesFilters, matchingTags, tagFilterKey } from "./tags";

describe("matchesFilters", () => {
  const a = parseLine("(A) Email Bob +work @phone", 0);
  const b = parseLine("(B) Buy milk +grocery", 1);
  const c = parseLine("(C) Call mom @phone", 2);

  it("returns true when filters list is empty", () => {
    expect(matchesFilters(a, [])).toBe(true);
    expect(matchesFilters(b, [])).toBe(true);
  });

  it("matches a single project filter", () => {
    expect(matchesFilters(a, [{ kind: "project", name: "work" }])).toBe(true);
    expect(matchesFilters(b, [{ kind: "project", name: "work" }])).toBe(false);
  });

  it("matches a single context filter", () => {
    expect(matchesFilters(a, [{ kind: "context", name: "phone" }])).toBe(true);
    expect(matchesFilters(b, [{ kind: "context", name: "phone" }])).toBe(false);
  });

  it("ANDs multiple filters: task must satisfy all", () => {
    const filters = [
      { kind: "project" as const, name: "work" },
      { kind: "context" as const, name: "phone" },
    ];
    expect(matchesFilters(a, filters)).toBe(true);
    expect(matchesFilters(b, filters)).toBe(false);
    expect(matchesFilters(c, filters)).toBe(false);
  });

  it("treats project name 'work' as different from context name 'work'", () => {
    const t = parseLine("Do thing @work", 0);
    expect(matchesFilters(t, [{ kind: "project", name: "work" }])).toBe(false);
    expect(matchesFilters(t, [{ kind: "context", name: "work" }])).toBe(true);
  });
});

describe("tagFilterKey", () => {
  it("produces a unique string per filter", () => {
    expect(tagFilterKey({ kind: "project", name: "work" })).toBe("project:work");
    expect(tagFilterKey({ kind: "context", name: "work" })).toBe("context:work");
  });
});

describe("currentPartialTag", () => {
  it("returns null when there is no active partial", () => {
    expect(currentPartialTag("")).toBeNull();
    expect(currentPartialTag("Email Bob")).toBeNull();
    expect(currentPartialTag("Email Bob ")).toBeNull();
  });

  it("detects a project partial at the end of input", () => {
    expect(currentPartialTag("Email Bob +wo")).toEqual({ kind: "project", partial: "wo" });
  });

  it("detects a context partial at the end of input", () => {
    expect(currentPartialTag("Call mom @ph")).toEqual({ kind: "context", partial: "ph" });
  });

  it("treats a bare '+' or '@' as the start of a partial (empty)", () => {
    expect(currentPartialTag("Email Bob +")).toEqual({ kind: "project", partial: "" });
    expect(currentPartialTag("Call mom @")).toEqual({ kind: "context", partial: "" });
  });

  it("matches at the very start of input", () => {
    expect(currentPartialTag("+work")).toEqual({ kind: "project", partial: "work" });
  });

  it("ignores '+'/'@' that aren't preceded by whitespace (e.g. emails)", () => {
    expect(currentPartialTag("Email alice@example")).toBeNull();
    expect(currentPartialTag("C++ release")).toBeNull();
  });

  it("returns null once a space follows the tag", () => {
    expect(currentPartialTag("Email Bob +work ")).toBeNull();
  });
});

describe("matchingTags", () => {
  it("returns all tags when partial is empty", () => {
    expect(matchingTags("", ["work", "home", "health"])).toEqual(["work", "home", "health"]);
  });

  it("returns tags that start with the partial, case-insensitive", () => {
    expect(matchingTags("wo", ["work", "home", "Work-overflow"])).toEqual(["work", "Work-overflow"]);
    expect(matchingTags("Ho", ["work", "home"])).toEqual(["home"]);
  });

  it("returns empty when nothing matches", () => {
    expect(matchingTags("xyz", ["work", "home"])).toEqual([]);
  });
});
