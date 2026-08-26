import { describe, expect, it } from "vitest";
import { BenchmarkHistory, BenchmarkRunInput, HistoryKeyValueStore, compatibilityKey } from "../src/history/history";

class MemoryStore implements HistoryKeyValueStore {
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this.values.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}

describe("BenchmarkHistory", () => {
  it("confirms the first baseline after a close compatible result", async () => {
    const history = new BenchmarkHistory(new MemoryStore());
    const first = runInput({ id: "run-1", read: 1_000, write: 900, completedAt: "2026-08-25T12:00:00.000Z" });
    const second = runInput({ id: "run-2", read: 970, write: 880, completedAt: "2026-08-25T12:05:00.000Z" });

    await history.recordSuccess(first);
    let volume = (await history.snapshot()).volumes["volume-1"];
    expect(volume.baselines[compatibilityKey(first)]).toMatchObject({ runId: "run-1", status: "provisional" });

    await history.recordSuccess(second);
    volume = (await history.snapshot()).volumes["volume-1"];
    expect(volume.baselines[compatibilityKey(second)]).toMatchObject({ runId: "run-1", status: "confirmed" });
    expect(volume.successfulRuns.map((run) => run.id)).toEqual(["run-2", "run-1"]);
  });

  it("keeps separate baselines for different data and time targets", async () => {
    const history = new BenchmarkHistory(new MemoryStore());
    const standard = runInput({ id: "run-1", read: 1_000, write: 900, completedAt: "2026-08-25T12:00:00.000Z" });
    const configured = runInput({
      id: "run-2",
      read: 1_000,
      write: 900,
      completedAt: "2026-08-25T12:05:00.000Z",
    });
    configured.configuration.maxBytes = 536_870_912;
    configured.configuration.targetDurationSeconds = 3;
    configured.result.maxBytes = configured.configuration.maxBytes;
    configured.result.measuredBytes = configured.configuration.maxBytes;

    await history.recordSuccess(standard);
    await history.recordSuccess(configured);

    const volume = (await history.snapshot()).volumes["volume-1"];
    expect(compatibilityKey(configured)).not.toBe(compatibilityKey(standard));
    expect(Object.keys(volume.baselines)).toHaveLength(2);
    expect(volume.baselines[compatibilityKey(standard)]).toMatchObject({ runId: "run-1", status: "provisional" });
    expect(volume.baselines[compatibilityKey(configured)]).toMatchObject({ runId: "run-2", status: "provisional" });
  });

  it("replaces and removes baselines through history actions", async () => {
    const history = new BenchmarkHistory(new MemoryStore());
    const first = runInput({ id: "run-1", read: 1_000, write: 900, completedAt: "2026-08-25T12:00:00.000Z" });
    const second = runInput({ id: "run-2", read: 970, write: 880, completedAt: "2026-08-25T12:05:00.000Z" });
    const key = compatibilityKey(first);
    await history.recordSuccess(first);
    await history.recordSuccess(second);

    await history.setBaseline("volume-1", key, "run-2");
    let volume = (await history.snapshot()).volumes["volume-1"];
    expect(volume.baselines[key]).toMatchObject({ runId: "run-2", status: "confirmed" });

    await history.deleteRun("volume-1", "run-2");
    volume = (await history.snapshot()).volumes["volume-1"];
    expect(volume.baselines[key]).toBeUndefined();
    expect(volume.successfulRuns.map((run) => run.id)).toEqual(["run-1"]);

    await history.deleteVolume("volume-1");
    expect((await history.snapshot()).volumes["volume-1"]).toBeUndefined();
  });

  it("keeps a separate bounded diagnostic history", async () => {
    const history = new BenchmarkHistory(new MemoryStore());

    for (let index = 0; index < 7; index += 1) {
      await history.recordDiagnostic({
        id: `diagnostic-${index}`,
        completedAt: `2026-08-25T12:0${index}:00.000Z`,
        status: index % 2 === 0 ? "cancelled" : "failed",
        code: index % 2 === 0 ? "cancelled" : "permission_denied",
        message: index % 2 === 0 ? "Benchmark cancelled" : "Permission denied",
      });
    }

    expect((await history.snapshot()).diagnostics.map((diagnostic) => diagnostic.id)).toEqual([
      "diagnostic-6",
      "diagnostic-5",
      "diagnostic-4",
      "diagnostic-3",
      "diagnostic-2",
    ]);
  });

  it("retains at most twenty successful runs for a volume", async () => {
    const history = new BenchmarkHistory(new MemoryStore());

    for (let index = 0; index < 25; index += 1) {
      await history.recordSuccess(
        runInput({
          id: `run-${index}`,
          read: 1_000,
          write: 900,
          completedAt: `2026-08-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
        }),
      );
    }

    const volume = (await history.snapshot()).volumes["volume-1"];
    expect(volume.successfulRuns).toHaveLength(20);
    expect(volume.successfulRuns.some((run) => run.id === "run-0")).toBe(false);
    expect(volume.successfulRuns.some((run) => run.id === "run-5")).toBe(true);
    expect(volume.successfulRuns[0].id).toBe("run-24");
    expect(volume.baselines[compatibilityKey(volume.successfulRuns[0])].runId).toBe("run-0");
  });

  it("keeps a detached baseline manageable after its run leaves recent history", async () => {
    const history = new BenchmarkHistory(new MemoryStore());

    for (let index = 0; index < 21; index += 1) {
      await history.recordSuccess(
        runInput({
          id: `run-${index}`,
          read: 1_000,
          write: 900,
          completedAt: `2026-08-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
        }),
      );
    }

    let volume = (await history.snapshot()).volumes["volume-1"];
    const key = compatibilityKey(volume.successfulRuns[0]);
    expect(volume.baselines[key].runId).toBe("run-0");

    for (const run of volume.successfulRuns) await history.deleteRun("volume-1", run.id);
    volume = (await history.snapshot()).volumes["volume-1"];
    expect(volume.successfulRuns).toEqual([]);
    expect(volume.baselines[key].runId).toBe("run-0");

    await history.resetBaseline("volume-1", key);
    expect((await history.snapshot()).volumes["volume-1"]).toBeUndefined();
  });
});

function runInput(overrides: { id: string; read: number; write: number; completedAt: string }): BenchmarkRunInput {
  return {
    id: overrides.id,
    completedAt: overrides.completedAt,
    volume: { id: "volume-1", name: "Example SSD" },
    result: {
      methodologyVersion: "sequential-v1",
      maxBytes: 1_073_741_824,
      measuredBytes: 1_073_741_824,
      confidence: "high",
      read: { durationSeconds: 1, megabytesPerSecond: overrides.read, variation: 0.02 },
      write: { durationSeconds: 1, megabytesPerSecond: overrides.write, variation: 0.02 },
      volume: { id: "volume-1", name: "Example SSD" },
    },
    configuration: {
      maxBytes: 1_073_741_824,
      warmupBytes: 33_554_432,
      targetDurationSeconds: 10,
      chunkSizeBytes: 4_194_304,
    },
  };
}
