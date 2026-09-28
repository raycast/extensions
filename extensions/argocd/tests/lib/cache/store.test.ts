import { describe, expect, it, vi } from "vitest";
import { CACHE_SCHEMA, ProjectionCache, type CacheDeps } from "../../../src/lib/cache/store";
import { projectSummary } from "../../../src/lib/argocd/project";
import type { AppSummary } from "../../../src/lib/argocd/types";

const ROOT = "/support/cache";

function app(name: string): AppSummary {
  const summary = projectSummary({ metadata: { name }, spec: { project: "team-a" } }, "i1");
  if (!summary) {
    throw new Error("fixture failed to project");
  }
  return summary;
}

/** An in-memory filesystem, so nothing is written during the suite. */
function memoryFs(seed: Record<string, string> = {}, now = () => 1_000_000) {
  const files = new Map(Object.entries(seed));
  const deps: CacheDeps = {
    readFile: vi.fn(async (path: string) => {
      const value = files.get(path);
      if (value === undefined) {
        throw Object.assign(new Error("no such file"), { code: "ENOENT" });
      }
      return value;
    }),
    writeFile: vi.fn(async (path: string, data: string) => {
      files.set(path, data);
    }),
    rename: vi.fn(async (from: string, to: string) => {
      const value = files.get(from);
      if (value === undefined) {
        throw new Error("nothing to rename");
      }
      files.delete(from);
      files.set(to, value);
    }),
    mkdir: vi.fn(async () => undefined),
    now,
  };
  return { files, deps };
}

describe("write and read", () => {
  it("round-trips the applications, the resourceVersion and the fetch time", async () => {
    const { deps } = memoryFs();
    const cache = new ProjectionCache(ROOT, deps);

    await cache.write("i1", [app("app-one"), app("app-two")]);
    const entry = await cache.read("i1");

    expect(entry?.schema).toBe(CACHE_SCHEMA);
    expect(entry?.fetchedAt).toBe(1_000_000);
    expect(entry?.apps.map((a) => a.name)).toEqual(["app-one", "app-two"]);
  });

  it("creates the cache directory and writes through a temporary file", async () => {
    const { files, deps } = memoryFs();
    await new ProjectionCache(ROOT, deps).write("i1", [app("app-one")]);

    expect(deps.mkdir).toHaveBeenCalledWith(ROOT);
    expect(deps.writeFile).toHaveBeenCalledWith(`${ROOT}/i1.json.tmp`, expect.any(String));
    expect(deps.rename).toHaveBeenCalledWith(`${ROOT}/i1.json.tmp`, `${ROOT}/i1.json`);
    expect(files.has(`${ROOT}/i1.json.tmp`)).toBe(false);
  });

  it("keeps one file per instance", async () => {
    const { files, deps } = memoryFs();
    const cache = new ProjectionCache(ROOT, deps);
    await cache.write("i1", [app("app-one")]);
    await cache.write("i2", [app("app-two")]);
    expect([...files.keys()].sort()).toEqual([`${ROOT}/i1.json`, `${ROOT}/i2.json`]);
  });
});

describe("read of a damaged cache", () => {
  it("returns undefined when the file does not exist", async () => {
    const { deps } = memoryFs();
    await expect(new ProjectionCache(ROOT, deps).read("i1")).resolves.toBeUndefined();
  });

  it("returns undefined for invalid JSON", async () => {
    const { deps } = memoryFs({ [`${ROOT}/i1.json`]: "{truncated" });
    await expect(new ProjectionCache(ROOT, deps).read("i1")).resolves.toBeUndefined();
  });

  it("returns undefined for a payload that is not an object", async () => {
    const { deps } = memoryFs({ [`${ROOT}/i1.json`]: "[]" });
    await expect(new ProjectionCache(ROOT, deps).read("i1")).resolves.toBeUndefined();
  });

  it("discards a cache written by an older schema instead of migrating it", async () => {
    const old = JSON.stringify({ schema: 1, fetchedAt: 1, resourceVersion: "1", apps: [app("app-one")] });
    const { deps } = memoryFs({ [`${ROOT}/i1.json`]: old });
    await expect(new ProjectionCache(ROOT, deps).read("i1")).resolves.toBeUndefined();
  });

  it("returns undefined when apps is not an array or fetchedAt is not a number", async () => {
    const { deps: a } = memoryFs({
      [`${ROOT}/i1.json`]: JSON.stringify({ schema: CACHE_SCHEMA, fetchedAt: 1, apps: "nope" }),
    });
    await expect(new ProjectionCache(ROOT, a).read("i1")).resolves.toBeUndefined();

    const { deps: b } = memoryFs({
      [`${ROOT}/i1.json`]: JSON.stringify({ schema: CACHE_SCHEMA, fetchedAt: "soon", apps: [] }),
    });
    await expect(new ProjectionCache(ROOT, b).read("i1")).resolves.toBeUndefined();
  });

  it("drops individual entries that are not identifiable applications", async () => {
    const mixed = JSON.stringify({
      schema: CACHE_SCHEMA,
      fetchedAt: 1,
      apps: [app("app-one"), null, 42, { name: "" }, { project: "team-a" }],
    });
    const { deps } = memoryFs({ [`${ROOT}/i1.json`]: mixed });
    const entry = await new ProjectionCache(ROOT, deps).read("i1");
    expect(entry?.apps.map((a) => a.name)).toEqual(["app-one"]);
  });
});

describe("staleness", () => {
  const entry = { schema: CACHE_SCHEMA, fetchedAt: 1_000_000, apps: [] };

  it("treats a missing entry as stale", () => {
    const { deps } = memoryFs();
    expect(new ProjectionCache(ROOT, deps).isStale(undefined, 60)).toBe(true);
  });

  it("is fresh one second before the TTL and stale exactly on it", () => {
    const fresh = new ProjectionCache(ROOT, memoryFs({}, () => 1_000_000 + 59_000).deps);
    expect(fresh.isStale(entry, 60)).toBe(false);

    const stale = new ProjectionCache(ROOT, memoryFs({}, () => 1_000_000 + 60_000).deps);
    expect(stale.isStale(entry, 60)).toBe(true);
  });

  it("reports the age in whole seconds", () => {
    const cache = new ProjectionCache(ROOT, memoryFs({}, () => 1_000_000 + 90_900).deps);
    expect(cache.ageSeconds(entry)).toBe(90);
  });
});

describe("path safety", () => {
  it("refuses an instance id that would escape the cache directory", () => {
    const cache = new ProjectionCache(ROOT, memoryFs().deps);
    for (const id of ["../etc/passwd", "a/b", "a\\b", "..", ""]) {
      expect(() => cache.path(id)).toThrowError(/safe filename/);
    }
  });

  it("accepts a generated id", () => {
    const cache = new ProjectionCache(ROOT, memoryFs().deps);
    expect(cache.path("7c9e6679-7425-40de-944b-e07fc1f90ae7")).toBe(
      `${ROOT}/7c9e6679-7425-40de-944b-e07fc1f90ae7.json`,
    );
  });
});
