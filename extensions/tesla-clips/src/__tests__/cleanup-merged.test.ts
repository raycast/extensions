import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { trash } from "@raycast/api";
import { buildCleanupSummaryMessage, cleanupEventMergedDir, getCleanupTargetEvents } from "../lib/cleanup-merged";
import { assessEventMergeReadiness, MIN_VALID_MERGED_OUTPUT_BYTES } from "../lib/merge-readiness";
import type { TeslaEvent } from "../types";
import { setupEventDirWithMergedOutput } from "./test-helpers";

function buildEvent(eventDir: string): TeslaEvent {
  return {
    id: eventDir,
    eventDir,
    sourceRoot: path.dirname(eventDir),
    folderName: path.basename(eventDir),
    cameras: [
      {
        camera: "front",
        segments: [
          { timestamp: "2025-09-29_07-01-59", camera: "front", filePath: path.join(eventDir, "front.mp4") },
          { timestamp: "2025-09-29_07-02-59", camera: "front", filePath: path.join(eventDir, "front2.mp4") },
        ],
        gaps: [],
      },
    ],
    totalSegments: 2,
    totalGaps: 0,
  };
}

describe("cleanup-merged", () => {
  let tempDir: string;

  afterEach(async () => {
    vi.clearAllMocks();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("detects cleanup targets from valid outputs and corrupt merged dirs", async () => {
    const setup = await setupEventDirWithMergedOutput("tesla-cleanup-");
    tempDir = setup.tempDir;
    const { eventDir, mergedDir } = setup;
    await writeFile(path.join(mergedDir, "front-2025-09-29_07-01-59.mp4"), "x".repeat(MIN_VALID_MERGED_OUTPUT_BYTES));

    const event = buildEvent(eventDir);
    const readiness = await assessEventMergeReadiness(event);
    const enriched = { ...event, readiness };

    expect(getCleanupTargetEvents([enriched])).toHaveLength(1);

    const corruptDir = path.join(tempDir, "2025-10-01_08-00-00");
    const corruptMergedDir = path.join(corruptDir, "merged");
    await mkdir(corruptMergedDir, { recursive: true });
    await writeFile(path.join(corruptMergedDir, "front-2025-10-01_08-00-00.mp4"), "stub");

    const corruptEvent = buildEvent(corruptDir);
    const corruptReadiness = await assessEventMergeReadiness(corruptEvent);
    expect(corruptReadiness.hasMergedOutputDir).toBe(true);
    expect(getCleanupTargetEvents([{ ...corruptEvent, readiness: corruptReadiness }])).toHaveLength(1);
  });

  it("trashes merged output directories", async () => {
    const setup = await setupEventDirWithMergedOutput("tesla-cleanup-");
    tempDir = setup.tempDir;
    const { eventDir, mergedDir } = setup;

    const event = buildEvent(eventDir);
    const result = await cleanupEventMergedDir(event);

    expect(result.success).toBe(true);
    expect(trash).toHaveBeenCalledWith(mergedDir);
  });

  it("builds cleanup summary messages", () => {
    expect(buildCleanupSummaryMessage(3, 0)).toBe("Removed 3 merged folders");
    expect(buildCleanupSummaryMessage(1, 1)).toBe("Removed 1 merged folder, 1 failed");
    expect(buildCleanupSummaryMessage(0, 0)).toBe("No merged folders to remove");
  });
});
