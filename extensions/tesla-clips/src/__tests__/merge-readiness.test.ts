import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assessEventMergeReadiness,
  buildInitialOverwriteKeys,
  countPlannedMerges,
  enrichEventsWithReadiness,
  enrichScanResultWithReadiness,
  eventHasExistingOutputs,
  eventsNeedMergeReview,
  getMergeOutputKey,
  isValidMergedOutput,
  isValidMergedOutputSize,
  MIN_VALID_MERGED_OUTPUT_BYTES,
  shouldOverwriteOutput,
} from "../lib/merge-readiness";
import type { TeslaEvent } from "../types";
import { setupEventDirWithMergedOutput } from "./test-helpers";

function buildEvent(eventDir: string, cameras: TeslaEvent["cameras"]): TeslaEvent {
  return {
    id: eventDir,
    eventDir,
    sourceRoot: path.dirname(eventDir),
    folderName: path.basename(eventDir),
    cameras,
    totalSegments: cameras.reduce((sum, group) => sum + group.segments.length, 0),
    totalGaps: 0,
  };
}

/** Builds a two-camera (front + back, 2 segments each) event used by most readiness fixtures. */
function buildTwoCameraEvent(eventDir: string): TeslaEvent {
  return buildEvent(eventDir, [
    {
      camera: "front",
      segments: [
        { timestamp: "2025-09-29_07-01-59", camera: "front", filePath: path.join(eventDir, "a.mp4") },
        { timestamp: "2025-09-29_07-02-59", camera: "front", filePath: path.join(eventDir, "b.mp4") },
      ],
      gaps: [],
    },
    {
      camera: "back",
      segments: [
        { timestamp: "2025-09-29_07-01-59", camera: "back", filePath: path.join(eventDir, "c.mp4") },
        { timestamp: "2025-09-29_07-02-59", camera: "back", filePath: path.join(eventDir, "d.mp4") },
      ],
      gaps: [],
    },
  ]);
}

async function writeValidMergedFile(filePath: string): Promise<void> {
  await writeFile(filePath, "x".repeat(MIN_VALID_MERGED_OUTPUT_BYTES));
}

describe("merge-readiness", () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("validates merged output size thresholds", () => {
    expect(MIN_VALID_MERGED_OUTPUT_BYTES).toBe(1024);
    expect(isValidMergedOutputSize(1024)).toBe(true);
    expect(isValidMergedOutputSize(1023)).toBe(false);
    expect(isValidMergedOutputSize(48)).toBe(false);
    expect(isValidMergedOutputSize(0)).toBe(false);
  });

  it("treats missing paths and directories as invalid merged outputs", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "tesla-readiness-"));
    const missingPath = path.join(tempDir, "missing.mp4");

    expect(await isValidMergedOutput(missingPath)).toBe(false);

    await mkdir(tempDir, { recursive: true });
    expect(await isValidMergedOutput(tempDir)).toBe(false);
  });

  it("accepts valid merged output files on disk", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "tesla-readiness-"));
    const outputPath = path.join(tempDir, "front-2025-09-29_07-01-59.mp4");
    await writeValidMergedFile(outputPath);

    expect(await isValidMergedOutput(outputPath)).toBe(true);
  });

  it("detects complete, partial, and none existing states", async () => {
    const { tempDir: dir, eventDir, mergedDir } = await setupEventDirWithMergedOutput("tesla-readiness-");
    tempDir = dir;
    await writeValidMergedFile(path.join(mergedDir, "front-2025-09-29_07-01-59.mp4"));

    const event = buildTwoCameraEvent(eventDir);

    const readiness = await assessEventMergeReadiness(event);
    expect(readiness.existingState).toBe("partial");
    expect(readiness.existingOutputCount).toBe(1);
    expect(readiness.pendingMergeCount).toBe(1);

    await writeValidMergedFile(path.join(mergedDir, "back-2025-09-29_07-01-59.mp4"));
    const complete = await assessEventMergeReadiness(event);
    expect(complete.existingState).toBe("complete");
    expect(complete.pendingMergeCount).toBe(0);
  });

  it("ignores corrupt merged outputs that are too small", async () => {
    const { tempDir: dir, eventDir, mergedDir } = await setupEventDirWithMergedOutput("tesla-readiness-");
    tempDir = dir;
    await writeFile(path.join(mergedDir, "front-2025-09-29_07-01-59.mp4"), "bad");

    const event = buildTwoCameraEvent(eventDir);

    const readiness = await assessEventMergeReadiness(event);
    expect(readiness.existingOutputCount).toBe(0);
    expect(readiness.existingState).toBe("none");
    expect(readiness.pendingMergeCount).toBe(2);
  });

  it("builds overwrite keys and planned merge counts", async () => {
    const { tempDir: dir, eventDir, mergedDir } = await setupEventDirWithMergedOutput("tesla-readiness-");
    tempDir = dir;
    await writeValidMergedFile(path.join(mergedDir, "front-2025-09-29_07-01-59.mp4"));

    const event = buildTwoCameraEvent(eventDir);

    const enriched = {
      ...event,
      readiness: await assessEventMergeReadiness(event),
    };

    expect(eventsNeedMergeReview([enriched])).toBe(true);
    expect(buildInitialOverwriteKeys([enriched], false).size).toBe(0);
    expect(buildInitialOverwriteKeys([enriched], true).size).toBe(1);
    expect(countPlannedMerges([enriched], new Set())).toBe(1);
    expect(countPlannedMerges([enriched], new Set([getMergeOutputKey(eventDir, "front")]))).toBe(2);
  });

  it("honors per-camera overwrite selections", () => {
    const key = getMergeOutputKey("/event", "front");
    expect(
      shouldOverwriteOutput("/event", "front", { overwriteExisting: false, overwriteOutputs: new Set([key]) }),
    ).toBe(true);
    expect(shouldOverwriteOutput("/event", "front", { overwriteExisting: true, overwriteOutputs: new Set() })).toBe(
      false,
    );
    expect(shouldOverwriteOutput("/event", "front", { overwriteExisting: true })).toBe(true);
    expect(shouldOverwriteOutput("/event", "front", { overwriteExisting: false })).toBe(false);
  });

  it("enriches events and detects existing outputs helper", async () => {
    const { tempDir: dir, eventDir, mergedDir } = await setupEventDirWithMergedOutput("tesla-readiness-");
    tempDir = dir;
    await writeValidMergedFile(path.join(mergedDir, "front-2025-09-29_07-01-59.mp4"));

    const event = buildEvent(eventDir, [
      {
        camera: "front",
        segments: [
          { timestamp: "2025-09-29_07-01-59", camera: "front", filePath: path.join(eventDir, "a.mp4") },
          { timestamp: "2025-09-29_07-02-59", camera: "front", filePath: path.join(eventDir, "b.mp4") },
        ],
        gaps: [],
      },
    ]);

    const enriched = await enrichEventsWithReadiness([event]);
    expect(enriched[0]?.readiness?.existingState).toBe("complete");
    expect(eventHasExistingOutputs(enriched[0]!)).toBe(true);
    expect(eventHasExistingOutputs(event)).toBe(false);
  });

  it("summarizes scan results with existing event counts", async () => {
    const { tempDir: dir, eventDir, mergedDir } = await setupEventDirWithMergedOutput("tesla-readiness-");
    tempDir = dir;
    await writeValidMergedFile(path.join(mergedDir, "front-2025-09-29_07-01-59.mp4"));
    await writeValidMergedFile(path.join(mergedDir, "back-2025-09-29_07-01-59.mp4"));

    const event = buildTwoCameraEvent(eventDir);

    const enriched = {
      ...event,
      readiness: await assessEventMergeReadiness(event),
    };

    const summary = enrichScanResultWithReadiness(
      {
        events: [enriched],
        totalEvents: 1,
        totalCameras: 2,
        totalSegments: 4,
        totalGaps: 0,
      },
      [enriched],
    );

    expect(summary.totalExistingEvents).toBe(1);
    expect(summary.totalPartialExistingEvents).toBe(0);
  });
});
