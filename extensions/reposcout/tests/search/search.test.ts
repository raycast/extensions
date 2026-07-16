import { describe, expect, it } from "vitest";
import { searchRepositories } from "../../src/search/search";
import type { RepositoryRecord, RepositoryUserData } from "../../src/types/repository";
import { makeRecord, makeUserData } from "../helpers/fixtures";

const nowMs = 1_000_000_000_000;

function search(
  query: string,
  records: RepositoryRecord[],
  userData: Map<string, RepositoryUserData> = new Map(),
) {
  return searchRepositories(query, records, userData, { nowMs });
}

describe("searchRepositories", () => {
  const records = [
    makeRecord({ path: "/code/app", name: "app" }),
    makeRecord({ path: "/code/application", name: "application" }),
    makeRecord({ path: "/code/backend", name: "backend" }),
  ];

  it("excludes non-matching repositories", () => {
    const names = search("app", records).map((r) => r.record.name);
    expect(names).toContain("app");
    expect(names).toContain("application");
    expect(names).not.toContain("backend");
  });

  it("ranks an exact match above a prefix match", () => {
    const results = search("app", records);
    expect(results[0]?.record.name).toBe("app");
    expect(results[1]?.record.name).toBe("application");
  });

  it("returns everything for an empty query", () => {
    expect(search("", records)).toHaveLength(3);
    expect(search("   ", records)).toHaveLength(3);
  });

  it("ranks favorites ahead on an empty query", () => {
    const userData = new Map([["/code/backend", makeUserData({ favorite: true })]]);
    const results = search("", records, userData);
    expect(results[0]?.record.name).toBe("backend");
  });

  it("floats a pinned repository to the top despite a weaker match", () => {
    const userData = new Map([["/code/application", makeUserData({ pinned: true })]]);
    const results = search("app", records, userData);
    expect(results[0]?.record.name).toBe("application");
  });

  it("matches against the path when the name does not match", () => {
    const withPath = [
      makeRecord({ path: "/Users/tester/work/secret-thing", name: "secret-thing" }),
    ];
    // "work" appears in the path, not the name.
    const results = search("work", withPath, new Map());
    expect(results).toHaveLength(1);
    // Path-only matches expose a null highlight match.
    expect(results[0]?.match).toBeNull();
  });

  it("returns an empty array when nothing matches", () => {
    expect(search("zzzzz", records)).toEqual([]);
  });

  it("produces a stable, deterministic ordering for equal scores", () => {
    const twins = [
      makeRecord({ path: "/x/repo", name: "repo" }),
      makeRecord({ path: "/y/repo", name: "repo" }),
    ];
    const a = search("repo", twins).map((r) => r.record.path);
    const b = search("repo", twins).map((r) => r.record.path);
    expect(a).toEqual(b);
  });
});
