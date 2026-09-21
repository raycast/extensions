import { LaunchType } from "@raycast/api";
import { describe, expect, it, vi } from "vitest";

import { collectMenuBarSnapshot } from "../menubar/collect-snapshot";
import { MenuBarCollectors, PinnedStat } from "../menubar/types";
import { fixtureCollectors, fixtureSnapshot } from "./menubar-fixtures";

function spies(): MenuBarCollectors {
  const collectors = fixtureCollectors();
  return Object.fromEntries(
    Object.entries(collectors).map(([name, collector]) => [name, vi.fn(collector)]),
  ) as unknown as MenuBarCollectors;
}

describe("collectMenuBarSnapshot", () => {
  it.each<[PinnedStat, keyof MenuBarCollectors | undefined]>([
    ["none", undefined],
    ["cpu", "cpu"],
    ["memory", undefined],
    ["storage", "backgroundStorage"],
    ["battery", undefined],
    ["network", undefined],
    ["temperature", undefined],
  ])("selects only the safe collector for background pin %s", async (pinnedStat, expectedCollector) => {
    const collectors = spies();

    await collectMenuBarSnapshot({ launchType: LaunchType.Background, pinnedStat, collectors });

    for (const [name, collector] of Object.entries(collectors)) {
      expect(collector, name).toHaveBeenCalledTimes(name === expectedCollector ? 1 : 0);
    }
  });

  it("never invokes nettop or temperature-reader collectors in the background", async () => {
    const collectors = spies();

    for (const pinnedStat of ["network", "temperature"] satisfies PinnedStat[]) {
      await collectMenuBarSnapshot({ launchType: LaunchType.Background, pinnedStat, collectors });
    }

    expect(collectors.network).not.toHaveBeenCalled();
    expect(collectors.temperature).not.toHaveBeenCalled();
  });

  it("preserves the user-collected memory value without recalculating it in the background", async () => {
    const collectors = spies();
    vi.mocked(collectors.memory).mockResolvedValueOnce({ totalMem: "16", freeMemPercentage: "50", freeMem: "8" });

    const opened = await collectMenuBarSnapshot({
      launchType: LaunchType.UserInitiated,
      pinnedStat: "memory",
      collectors,
      now: () => 2_000,
    });
    const background = await collectMenuBarSnapshot({
      launchType: LaunchType.Background,
      pinnedStat: "memory",
      previous: opened,
      collectors,
      now: () => 3_000,
    });

    expect(collectors.memory).toHaveBeenCalledOnce();
    expect(background.values.memory).toEqual({
      status: "cached",
      value: { totalMem: "16", freeMemPercentage: "50", freeMem: "8" },
      collectedAt: 2_000,
      reason: "Memory updates when the menu is opened",
    });
  });

  it("marks memory unavailable before the first user-opened collection", async () => {
    const collectors = spies();
    const snapshot = await collectMenuBarSnapshot({
      launchType: LaunchType.Background,
      pinnedStat: "memory",
      collectors,
    });

    expect(collectors.memory).not.toHaveBeenCalled();
    expect(snapshot.values.memory).toEqual({
      status: "unavailable",
      reason: "Memory updates when the menu is opened",
    });
  });

  it("allows a user-initiated launch to collect full data", async () => {
    const collectors = spies();

    await collectMenuBarSnapshot({ launchType: LaunchType.UserInitiated, pinnedStat: "none", collectors });

    expect(collectors.osInfo).toHaveBeenCalledOnce();
    expect(collectors.storage).toHaveBeenCalledOnce();
    expect(collectors.cpu).toHaveBeenCalledOnce();
    expect(collectors.memory).toHaveBeenCalledOnce();
    expect(collectors.network).toHaveBeenCalledOnce();
    expect(collectors.battery).toHaveBeenCalledOnce();
    expect(collectors.temperature).toHaveBeenCalledOnce();
    expect(collectors.backgroundStorage).not.toHaveBeenCalled();
  });

  it("returns the last network value when the expensive collector is skipped", async () => {
    const previous = fixtureSnapshot();

    const snapshot = await collectMenuBarSnapshot({
      launchType: LaunchType.Background,
      pinnedStat: "network",
      previous,
      collectors: spies(),
    });

    expect(snapshot.values.networkUsage).toEqual({
      status: "cached",
      value: { upload: 10, download: 20 },
      collectedAt: 1_000,
      reason: "External collectors are skipped during background refresh",
    });
  });

  it("returns an explicit unavailable state when a skipped collector has no cached value", async () => {
    const snapshot = await collectMenuBarSnapshot({
      launchType: LaunchType.Background,
      pinnedStat: "temperature",
      collectors: spies(),
    });

    expect(snapshot.values.temperatureData).toEqual({
      status: "unavailable",
      reason: "External collectors are skipped during background refresh",
    });
  });

  it("retains the last valid field after a partial collection failure", async () => {
    const collectors = spies();
    vi.mocked(collectors.cpu).mockRejectedValueOnce(new Error("cpu sample failed"));

    const snapshot = await collectMenuBarSnapshot({
      launchType: LaunchType.UserInitiated,
      pinnedStat: "cpu",
      previous: fixtureSnapshot(),
      collectors,
    });

    expect(snapshot.values.cpuUsage).toEqual({
      status: "failed",
      value: "42",
      collectedAt: 1_000,
      error: "cpu sample failed",
    });
    expect(snapshot.values.memory.status).toBe("fresh");
  });

  it("rejects an empty collector result without destroying the last valid field", async () => {
    const collectors = spies();
    vi.mocked(collectors.storage).mockResolvedValueOnce([]);

    const snapshot = await collectMenuBarSnapshot({
      launchType: LaunchType.UserInitiated,
      pinnedStat: "storage",
      previous: fixtureSnapshot(),
      collectors,
    });

    expect(snapshot.values.storage).toEqual({
      status: "failed",
      value: [{ diskName: "Macintosh HD", totalSize: "500", totalAvailableStorage: "200", usedStorage: "300" }],
      collectedAt: 1_000,
      error: "Collector returned invalid or empty data",
    });
  });
});
