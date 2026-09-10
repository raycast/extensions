import { describe, expect, it } from "vitest";
import { appKey, defaultOrder, rankAppSets, rankApps, scoreApp } from "../../../src/lib/search/score";
import { projectSummary } from "../../../src/lib/argocd/project";
import type { AppSummary } from "../../../src/lib/argocd/types";

function app(name: string, overrides: Partial<AppSummary> = {}): AppSummary {
  const summary = projectSummary(
    {
      metadata: { name, namespace: "team-a-apps" },
      spec: {
        project: "team-a",
        destination: { namespace: "team-a-runtime" },
        source: { repoURL: "https://git.example.com/team-a/manifests.git", path: `apps/${name}` },
      },
      status: { sync: { status: "Synced" }, health: { status: "Healthy" } },
    },
    "i1",
  );
  if (!summary) {
    throw new Error("fixture failed to project");
  }
  return { ...summary, ...overrides };
}

describe("scoreApp", () => {
  it("ranks exact above prefix above substring above haystack", () => {
    const query = "redis";
    const exact = scoreApp(app("redis"), query);
    const prefix = scoreApp(app("redis-cache"), query);
    const substring = scoreApp(app("team-redis-cache"), query);
    const haystack = scoreApp(app("cache", { haystack: "cache redis-generator" }), query);

    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(haystack);
    expect(haystack).toBeGreaterThan(0);
  });

  it("is case-insensitive", () => {
    expect(scoreApp(app("Redis-Cache"), "redis")).toBe(scoreApp(app("redis-cache"), "REDIS"));
  });

  it("returns zero when nothing matches", () => {
    expect(scoreApp(app("redis-cache"), "postgres")).toBe(0);
  });

  it("returns zero for an empty query, so callers use the default ordering", () => {
    expect(scoreApp(app("redis-cache"), "")).toBe(0);
    expect(scoreApp(app("redis-cache"), "   ")).toBe(0);
  });

  it("requires every word of a multi-word query to match somewhere", () => {
    const target = app("redis-cache");
    expect(scoreApp(target, "team-a redis")).toBeGreaterThan(0);
    expect(scoreApp(target, "team-a postgres")).toBe(0);
  });

  it("prefers a shorter name when both merely contain the query", () => {
    expect(scoreApp(app("redis-cache"), "redis")).toBeGreaterThan(
      scoreApp(app("redis-cache-with-a-long-suffix"), "redis"),
    );
  });
});

describe("rankApps", () => {
  it("sorts by descending score then by name", () => {
    const apps = [app("zzz-redis"), app("redis"), app("redis-cache"), app("aaa-redis")];
    const result = rankApps(apps, "redis", { limit: 10 });
    expect(result.items.map((a) => a.name)).toEqual(["redis", "redis-cache", "aaa-redis", "zzz-redis"]);
  });

  it("caps the result and reports the untruncated total", () => {
    const apps = Array.from({ length: 200 }, (_, index) => app(`redis-${String(index).padStart(3, "0")}`));
    const result = rankApps(apps, "redis", { limit: 60 });
    expect(result.items).toHaveLength(60);
    expect(result.truncated).toBe(true);
    expect(result.total).toBe(200);
  });

  it("is not truncated when the result fits", () => {
    const result = rankApps([app("redis")], "redis", { limit: 60 });
    expect(result).toMatchObject({ truncated: false, total: 1 });
  });

  it("returns nothing for a query that matches nothing", () => {
    expect(rankApps([app("redis")], "postgres", { limit: 60 })).toEqual({
      items: [],
      truncated: false,
      total: 0,
    });
  });

  it("matches on the project through the haystack", () => {
    const result = rankApps([app("redis"), app("postgres")], "team-a", { limit: 60 });
    expect(result.total).toBe(2);
  });
});

describe("rankAppSets", () => {
  it("applies the same scoring and cap to any named item", () => {
    const sets = [
      { name: "team-a-set", haystack: "team-a-set team-a" },
      { name: "team-b-set", haystack: "team-b-set team-b" },
    ];
    expect(rankAppSets(sets, "team-a", 10).items.map((s) => s.name)).toEqual(["team-a-set"]);
    expect(rankAppSets(sets, "set", 1)).toMatchObject({ truncated: true, total: 2 });
  });
});

describe("defaultOrder", () => {
  const healthy = app("healthy-one");
  const degraded = app("degraded-one", { health: "Degraded" });
  const outOfSync = app("out-of-sync-one", { sync: "OutOfSync" });
  const alsoHealthy = app("another-healthy");

  it("puts recent applications first, in the order they were used", () => {
    const apps = [healthy, degraded, outOfSync, alsoHealthy];
    const result = defaultOrder(apps, [appKey(alsoHealthy), appKey(healthy)], 60);
    expect(result.items.slice(0, 2).map((a) => a.name)).toEqual(["another-healthy", "healthy-one"]);
  });

  it("then lists what needs attention, sorted by name", () => {
    const result = defaultOrder([healthy, degraded, outOfSync, alsoHealthy], [], 60);
    expect(result.items.map((a) => a.name)).toEqual([
      "degraded-one",
      "out-of-sync-one",
      "another-healthy",
      "healthy-one",
    ]);
  });

  it("never lists a recent application twice", () => {
    const result = defaultOrder([healthy, degraded], [appKey(degraded)], 60);
    expect(result.items.map((a) => a.name)).toEqual(["degraded-one", "healthy-one"]);
    expect(result.total).toBe(2);
  });

  it("ignores a recent key whose application is gone", () => {
    const result = defaultOrder([healthy], ["i1/team-a-apps/deleted-app"], 60);
    expect(result.items.map((a) => a.name)).toEqual(["healthy-one"]);
  });

  it("caps and reports the total", () => {
    const apps = Array.from({ length: 100 }, (_, index) => app(`app-${index}`));
    expect(defaultOrder(apps, [], 60)).toMatchObject({ truncated: true, total: 100 });
  });

  it("handles an empty corpus", () => {
    expect(defaultOrder([], ["i1/ns/whatever"], 60)).toEqual({ items: [], truncated: false, total: 0 });
  });
});

describe("appKey", () => {
  it("identifies an application across instances and namespaces", () => {
    expect(appKey(app("redis"))).toBe("i1/team-a-apps/redis");
    expect(appKey(app("redis", { instanceId: "i2" }))).toBe("i2/team-a-apps/redis");
    expect(appKey(app("redis", { namespace: "other" }))).toBe("i1/other/redis");
  });
});
