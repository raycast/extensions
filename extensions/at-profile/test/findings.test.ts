import { beforeEach, describe, expect, it } from "vitest";
import { Cache } from "@raycast/api";
import { Findings, forgetLastSearch, lastSearchedProfile, readFindings, saveFindings } from "../src/helpers/findings";

const findings = (profile: string, overrides: Partial<Findings> = {}): Findings => ({
  profile,
  mode: "default",
  finishedAt: 1_700_000_000_000,
  durationMs: 1200,
  total: 3,
  canceled: false,
  outcomes: { github: { status: "found", httpStatus: 200 }, x: { status: "unchecked" } },
  ...overrides,
});

beforeEach(() => new Cache({ namespace: "findings" }).clear());

describe("findings", () => {
  it("keeps the last findings for a username, whatever its case or @", () => {
    saveFindings(findings("Example_User"));
    expect(readFindings("@example_user")).toMatchObject({ profile: "Example_User", total: 3 });
    expect(readFindings("someone_else")).toBeUndefined();
  });

  it("remembers the last username searched", () => {
    expect(lastSearchedProfile()).toBeUndefined();
    saveFindings(findings("first_user"));
    saveFindings(findings("second_user", { canceled: true }));
    expect(lastSearchedProfile()).toBe("second_user");
    expect(readFindings("second_user")?.canceled).toBe(true);
  });

  it("forgets the last username on Clear Search, and keeps its findings for History", () => {
    saveFindings(findings("example_user"));
    forgetLastSearch();
    expect(lastSearchedProfile()).toBeUndefined();
    expect(readFindings("example_user")).toBeDefined();
  });

  it("ignores damaged findings and outcomes it doesn't know", () => {
    const cache = new Cache({ namespace: "findings" });
    cache.set("profile:broken_user", "{not json");
    expect(readFindings("broken_user")).toBeUndefined();

    saveFindings(findings("odd_user", { outcomes: { github: { status: "found" }, x: { status: "maybe" } } as never }));
    expect(Object.keys(readFindings("odd_user")!.outcomes)).toEqual(["github"]);
  });
});
