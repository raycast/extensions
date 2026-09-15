import { randomUUID } from "node:crypto";
import { access, mkdtemp, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BenchmarkCancelledError,
  NativeBenchmarkBridge,
  NativeBenchmarkEngine,
} from "../src/benchmark/engine";
import { BenchmarkResult } from "../src/benchmark/protocol";

const configuration = {
  directory: "/tmp",
  maxBytes: 2_000_000,
  warmupBytes: 0,
  targetDurationSeconds: 5,
  chunkSizeBytes: 1_048_576,
};

const completedResult: BenchmarkResult = {
  methodologyVersion: "sequential-v1",
  maxBytes: 2_000_000,
  measuredBytes: 2_000_000,
  write: { durationSeconds: 1, megabytesPerSecond: 2, variation: 0.01 },
  read: { durationSeconds: 1, megabytesPerSecond: 2, variation: 0.02 },
  confidence: "high",
  volume: { id: "test-volume", name: "Test Volume" },
};

describe("NativeBenchmarkEngine", () => {
  it("streams Swift progress snapshots and returns the validated result", async () => {
    const bridge = bridgeWithRun(async (...argumentsForSwift) => {
      const progressFilePath = argumentsForSwift[7];
      await writeSnapshot(
        progressFilePath,
        JSON.stringify({
          protocolVersion: 1,
          type: "started",
          methodologyVersion: "sequential-v1",
          maxBytes: 2_000_000,
        }),
      );
      await delay(20);
      await writeSnapshot(
        progressFilePath,
        JSON.stringify({
          protocolVersion: 1,
          type: "progress",
          phase: "write",
          bytesProcessed: 1_000_000,
          totalBytes: 2_000_000,
          progress: 0.5,
          throughputMBps: 2,
        }),
      );
      await delay(20);
      return completedResult;
    });
    const engine = new NativeBenchmarkEngine(bridge, 5);
    const eventTypes: string[] = [];

    const result = await engine.run(configuration, { onEvent: (event) => eventTypes.push(event.type) });

    expect(eventTypes).toEqual(["started", "progress", "completed"]);
    expect(result).toEqual(completedResult);
  });

  it("creates a cancellation marker when the run is aborted", async () => {
    let observedCancellationMarker = false;
    const bridge = bridgeWithRun(async (...argumentsForSwift) => {
      const progressFilePath = argumentsForSwift[7];
      const cancellationFilePath = argumentsForSwift[8];
      await writeSnapshot(
        progressFilePath,
        JSON.stringify({
          protocolVersion: 1,
          type: "started",
          methodologyVersion: "sequential-v1",
          maxBytes: 2_000_000,
        }),
      );
      while (!(await fileExists(cancellationFilePath))) await delay(5);
      observedCancellationMarker = true;
      throw new Error("Benchmark cancelled");
    });
    const engine = new NativeBenchmarkEngine(bridge, 5);
    const controller = new AbortController();

    const run = engine.run(configuration, {
      signal: controller.signal,
      onEvent: (event) => {
        if (event.type === "started") controller.abort();
      },
    });

    await expect(run).rejects.toBeInstanceOf(BenchmarkCancelledError);
    expect(observedCancellationMarker).toBe(true);
  });

  it("removes the exact benchmark file after a native failure", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "disk-speed-engine-cleanup-"));
    const bridge = bridgeWithRun(async (...argumentsForSwift) => {
      const temporaryFileIdentifier = argumentsForSwift[1];
      await writeFile(path.join(directory, `.raycast-disk-speed-v1-${temporaryFileIdentifier}.tmp`), "test data");
      throw new Error("Native benchmark failed");
    });
    const engine = new NativeBenchmarkEngine(bridge, 5);

    try {
      await expect(engine.run({ ...configuration, directory })).rejects.toThrow("Native benchmark failed");
      expect(await readdir(directory)).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects malformed Swift progress output", async () => {
    const bridge = bridgeWithRun(async (...argumentsForSwift) => {
      await writeSnapshot(argumentsForSwift[7], "not-json");
      await delay(20);
      return completedResult;
    });
    const engine = new NativeBenchmarkEngine(bridge, 5);

    await expect(engine.run(configuration)).rejects.toThrow("Helper emitted invalid JSON");
  });

  it("rejects a malformed result returned by Swift", async () => {
    const engine = new NativeBenchmarkEngine(bridgeWithRun(async () => ({ id: randomUUID() })), 5);

    await expect(engine.run(configuration)).rejects.toThrow("Invalid helper event field: result.confidence");
  });
});

type RunBenchmark = NativeBenchmarkBridge["runBenchmark"];

function bridgeWithRun(runBenchmark: RunBenchmark): NativeBenchmarkBridge {
  return { runBenchmark };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function writeSnapshot(filePath: string, contents: string): Promise<void> {
  const temporaryPath = `${filePath}.next`;
  await writeFile(temporaryPath, contents);
  await rename(temporaryPath, filePath);
}
