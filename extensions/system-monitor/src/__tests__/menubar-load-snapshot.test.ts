import { LaunchType } from "@raycast/api";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadMenuBarSnapshot } from "../menubar/load-snapshot";
import { SnapshotCache } from "../menubar/snapshot-cache";
import { fixtureCollectors } from "./menubar-fixtures";

const temporaryDirectories: string[] = [];

class MemoryCache implements SnapshotCache {
  readonly store = new Map<string, string>();

  get(key: string) {
    return this.store.get(key);
  }

  set(key: string, value: string) {
    this.store.set(key, value);
  }
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("loadMenuBarSnapshot", () => {
  it("resolves the pinned statistic before starting any collector", async () => {
    const supportPath = await mkdtemp(path.join(tmpdir(), "system-monitor-load-"));
    temporaryDirectories.push(supportPath);
    const events: string[] = [];
    const collectors = fixtureCollectors();
    collectors.cpu = vi.fn(async () => {
      events.push("collector");
      return "42";
    });

    const result = await loadMenuBarSnapshot({
      launchType: LaunchType.Background,
      supportPath,
      cache: new MemoryCache(),
      collectors,
      storage: {
        getItem: async () => {
          events.push("preference");
          return "cpu";
        },
      },
    });

    expect(events).toEqual(["preference", "collector"]);
    expect(result.collectionState).toBe("collected");
    expect(result.pinnedStat).toBe("cpu");
  });
});
