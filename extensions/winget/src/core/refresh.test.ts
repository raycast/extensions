import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../cli/commands", () => ({
  listInstalledPackages: vi.fn(),
  listPinnedPackages: vi.fn(),
  listUpgradePackages: vi.fn(),
  searchAllPackages: vi.fn(),
}));
vi.mock("./operations", () => ({
  inspectOperationGate: vi.fn(() => ({ status: "free" })),
}));
vi.mock("./paths", () => ({
  supportPath: vi.fn(() => join(tmpdir(), "winget-refresh-test-lock.json")),
}));

import { listInstalledPackages, listPinnedPackages, listUpgradePackages } from "../cli/commands";

import { bumpMutationEpoch, currentMutationEpoch, loadIndex, patchMutable, type IndexPaths } from "./index-store";
import { DEFAULT_ENV } from "./lock";
import { refreshSlicesIncrementally } from "./refresh";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function rows(...ids: string[]) {
  return {
    items: ids.map((id) => ({
      id,
      name: id,
      version: "1.0",
      available: "2.0",
      source: "winget" as const,
    })),
    stats: { droppedTruncatedIds: 0 },
  };
}

/** Let pending .then callbacks run. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

let dir: string;
let paths: IndexPaths;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "winget-refresh-test-"));
  paths = {
    indexPath: join(dir, "index.json"),
    writeLockPath: join(dir, "index-write-lock.json"),
  };
  // Seed pre-refresh slices.
  patchMutable(paths, DEFAULT_ENV, { stampMutableAt: false }, () => ({
    installed: rows("old.installed").items,
    upgradable: rows("old.upgradable").items,
    pinned: rows("old.pinned").items,
  }));
  vi.mocked(listInstalledPackages).mockReset();
  vi.mocked(listUpgradePackages).mockReset();
  vi.mocked(listPinnedPackages).mockReset();
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("refreshSlicesIncrementally", () => {
  it("commits each slice as its query returns, stamping mutableAt only at the end", async () => {
    const installed = deferred<ReturnType<typeof rows>>();
    const upgradable = deferred<ReturnType<typeof rows>>();
    const pinned = deferred<ReturnType<typeof rows>>();
    vi.mocked(listInstalledPackages).mockReturnValue(installed.promise);
    vi.mocked(listUpgradePackages).mockReturnValue(upgradable.promise);
    vi.mocked(listPinnedPackages).mockReturnValue(pinned.promise);

    const startEpoch = currentMutationEpoch(paths);
    const run = refreshSlicesIncrementally(paths, { startEpoch });

    installed.resolve(rows("new.installed"));
    await tick();
    // installed is fresh while the other slices still show pre-refresh data.
    let index = loadIndex(paths)!;
    expect(index.installed.map((r) => r.id)).toEqual(["new.installed"]);
    expect(index.upgradable.map((r) => r.id)).toEqual(["old.upgradable"]);
    expect(index.mutableAt).toBeNull();

    upgradable.resolve(rows("new.upgradable"));
    pinned.resolve(rows("new.pinned"));
    const result = await run;

    expect(result.outcome).toBe("refreshed");
    expect(result.installed.map((r) => r.id)).toEqual(["new.installed"]);
    expect(result.upgradable.map((r) => r.id)).toEqual(["new.upgradable"]);
    index = loadIndex(paths)!;
    expect(index.pinned.map((r) => r.id)).toEqual(["new.pinned"]);
    expect(index.mutableAt).not.toBeNull();
  });

  it("rolls committed slices back to the pre-refresh snapshot when a query fails", async () => {
    vi.mocked(listInstalledPackages).mockResolvedValue(rows("new.installed"));
    vi.mocked(listPinnedPackages).mockResolvedValue(rows("new.pinned"));
    vi.mocked(listUpgradePackages).mockRejectedValue(new Error("query timed out"));

    const startEpoch = currentMutationEpoch(paths);
    await expect(refreshSlicesIncrementally(paths, { startEpoch })).rejects.toThrow("query timed out");

    const index = loadIndex(paths)!;
    expect(index.installed.map((r) => r.id)).toEqual(["old.installed"]);
    expect(index.upgradable.map((r) => r.id)).toEqual(["old.upgradable"]);
    expect(index.pinned.map((r) => r.id)).toEqual(["old.pinned"]);
    expect(index.mutableAt).toBeNull();
  });

  it("is fenced by an epoch bump and does not stamp mutableAt", async () => {
    vi.mocked(listInstalledPackages).mockResolvedValue(rows("new.installed"));
    vi.mocked(listUpgradePackages).mockResolvedValue(rows("new.upgradable"));
    vi.mocked(listPinnedPackages).mockResolvedValue(rows("new.pinned"));

    const startEpoch = currentMutationEpoch(paths);
    bumpMutationEpoch(paths, DEFAULT_ENV); // a mutation starts

    const result = await refreshSlicesIncrementally(paths, { startEpoch });

    expect(result.outcome).toBe("fenced");
    const index = loadIndex(paths)!;
    expect(index.installed.map((r) => r.id)).toEqual(["old.installed"]);
    expect(index.mutableAt).toBeNull();
  });

  it("is fenced when the ownership guard fails and writes nothing", async () => {
    vi.mocked(listInstalledPackages).mockResolvedValue(rows("new.installed"));
    vi.mocked(listUpgradePackages).mockResolvedValue(rows("new.upgradable"));
    vi.mocked(listPinnedPackages).mockResolvedValue(rows("new.pinned"));

    const result = await refreshSlicesIncrementally(paths, {
      stillOwned: () => false,
    });

    expect(result.outcome).toBe("fenced");
    const index = loadIndex(paths)!;
    expect(index.installed.map((r) => r.id)).toEqual(["old.installed"]);
    expect(index.mutableAt).toBeNull();
  });
});
