import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { type WingetSearchPackage, type WingetUpgradePackage } from "../cli/types";

import {
  bumpMutationEpoch,
  commitCatalog,
  currentMutationEpoch,
  isCatalogFresh,
  loadIndex,
  migrateLegacyIndex,
  patchMutable,
  type IndexPaths,
} from "./index-store";
import { type LockEnvironment } from "./lock";

let dir: string;
let paths: IndexPaths;

const env: LockEnvironment = {
  now: () => Date.now(),
  isWingetProcessAlive: () => false,
};

function pkg(id: string): WingetSearchPackage {
  return { id, name: id, version: "1.0", source: "winget" };
}

function upgradable(id: string): WingetUpgradePackage {
  return { id, name: id, version: "1.0", available: "2.0", source: "winget" };
}

function catalog(count: number): WingetSearchPackage[] {
  return Array.from({ length: count }, (_, i) => pkg(`pkg.${i}`));
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "winget-index-test-"));
  paths = {
    indexPath: join(dir, "index.json"),
    writeLockPath: join(dir, "index-write-lock.json"),
  };
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("patchMutable", () => {
  it("commits slice changes, bumps revision, never touches packages", () => {
    commitCatalog(paths, env, catalog(100));
    const before = loadIndex(paths)!;

    const outcome = patchMutable(paths, env, {}, (slices) => ({
      ...slices,
      upgradable: [upgradable("a")],
    }));

    expect(outcome).toBe("committed");
    const after = loadIndex(paths)!;
    expect(after.upgradable.map((u) => u.id)).toEqual(["a"]);
    expect(after.packages).toHaveLength(100);
    expect(after.revision).toBe(before.revision + 1);
  });

  it("is fenced when the mutation epoch advanced after the snapshot was taken", () => {
    commitCatalog(paths, env, catalog(10));
    patchMutable(paths, env, {}, (s) => ({
      ...s,
      upgradable: [upgradable("foo")],
    }));

    const snapshotEpoch = currentMutationEpoch(paths);
    // A mutation starts (op-lock acquired) and optimistically removes foo.
    bumpMutationEpoch(paths, env);
    patchMutable(paths, env, {}, (s) => ({ ...s, upgradable: [] }));

    // The pre-mutation refresher now tries to commit its stale snapshot.
    const outcome = patchMutable(paths, env, { startEpoch: snapshotEpoch, stampMutableAt: true }, (s) => ({
      ...s,
      upgradable: [upgradable("foo")],
    }));

    expect(outcome).toBe("fenced");
    expect(loadIndex(paths)!.upgradable).toHaveLength(0); // foo not resurrected
  });
});

describe("revision and epoch", () => {
  it("revision increases monotonically across interleaved writers", () => {
    const revisions: number[] = [];
    commitCatalog(paths, env, catalog(10));
    revisions.push(loadIndex(paths)!.revision);
    bumpMutationEpoch(paths, env);
    revisions.push(loadIndex(paths)!.revision);
    patchMutable(paths, env, {}, (s) => s);
    revisions.push(loadIndex(paths)!.revision);
    commitCatalog(paths, env, catalog(12));
    revisions.push(loadIndex(paths)!.revision);

    const sorted = [...revisions].sort((a, b) => a - b);
    expect(revisions).toEqual(sorted);
    expect(new Set(revisions).size).toBe(revisions.length);
  });

  it("bumpMutationEpoch increments the epoch", () => {
    const before = currentMutationEpoch(paths);
    const after = bumpMutationEpoch(paths, env);
    expect(after).toBe(before + 1);
    expect(currentMutationEpoch(paths)).toBe(after);
  });
});

describe("freshness and migration", () => {
  it("isCatalogFresh respects TTL and emptiness", () => {
    expect(isCatalogFresh(null, 1000, Date.now())).toBe(false);
    commitCatalog(paths, env, catalog(3));
    const index = loadIndex(paths)!;
    expect(isCatalogFresh(index, 60_000, Date.now())).toBe(true);
    expect(isCatalogFresh(index, 60_000, Date.now() + 120_000)).toBe(false);
  });

  it("migrates a legacy v1 index once and deletes the legacy file", () => {
    const legacyPath = join(dir, "winget-package-index.json");
    writeFileSync(
      legacyPath,
      JSON.stringify({
        packages: [pkg("legacy")],
        installed: [],
        upgradable: [],
        pinned: [],
        timestamp: 123,
      }),
    );

    expect(migrateLegacyIndex(paths, env, legacyPath)).toBe(true);
    const index = loadIndex(paths)!;
    expect(index.packages.map((p) => p.id)).toEqual(["legacy"]);
    expect(index.builtAt).toBe(123);

    // Second migration attempt: file gone, index untouched.
    expect(migrateLegacyIndex(paths, env, legacyPath)).toBe(false);
  });

  it("does not overwrite an existing catalog during migration", () => {
    commitCatalog(paths, env, catalog(2));
    const legacyPath = join(dir, "winget-package-index.json");
    writeFileSync(legacyPath, JSON.stringify({ packages: [pkg("legacy")], timestamp: 1 }));
    expect(migrateLegacyIndex(paths, env, legacyPath)).toBe(false);
    expect(loadIndex(paths)!.packages).toHaveLength(2);
  });
});
