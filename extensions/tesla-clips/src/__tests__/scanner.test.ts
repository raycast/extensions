import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildCameraGroups,
  collectSegmentsByCamera,
  detectGaps,
  findEventDirs,
  parseClipFilename,
  scanRoot,
} from "../lib/scanner";
import type { ClipSegment } from "../types";

async function setupScannerEventDir(
  dirName: string,
  clipFilenames: readonly string[],
): Promise<{ tempDir: string; eventDir: string }> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "tesla-scanner-"));
  const eventDir = path.join(tempDir, dirName);
  await mkdir(eventDir);
  for (const filename of clipFilenames) {
    await writeFile(path.join(eventDir, filename), "clip");
  }
  return { tempDir, eventDir };
}

describe("scanner", () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("parses valid clip filenames", () => {
    expect(parseClipFilename("2024-01-15_12-30-00-front.mp4")).toEqual({
      timestamp: "2024-01-15_12-30-00",
      camera: "front",
    });
  });

  it("rejects invalid clip filenames", () => {
    expect(parseClipFilename("not-a-clip.mp4")).toBeNull();
  });

  it("detects timeline gaps greater than two segment intervals", () => {
    const segments: ClipSegment[] = [
      { timestamp: "2024-01-15_12-30-00", camera: "front", filePath: "/a.mp4" },
      { timestamp: "2024-01-15_12-33-00", camera: "front", filePath: "/b.mp4" },
    ];
    const gaps = detectGaps(segments);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.gapSeconds).toBe(180);
  });

  it("builds camera groups with gap metadata", () => {
    const segments = new Map<string, ClipSegment[]>([
      [
        "front",
        [
          { timestamp: "2024-01-15_12-30-00", camera: "front", filePath: "/a.mp4" },
          { timestamp: "2024-01-15_12-33-00", camera: "front", filePath: "/b.mp4" },
        ],
      ],
    ]);
    const groups = buildCameraGroups(segments);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.camera).toBe("front");
    expect(groups[0]?.gaps).toHaveLength(1);
  });

  it("discovers event directories containing clips", async () => {
    const setup = await setupScannerEventDir("2024-01-15_12-00-00", [
      "2024-01-15_12-30-00-front.mp4",
      "2024-01-15_12-31-00-front.mp4",
    ]);
    tempDir = setup.tempDir;

    const eventDirs = await findEventDirs(tempDir);
    expect(eventDirs).toEqual([setup.eventDir]);
  });

  it("groups segments by camera within an event directory", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "tesla-scanner-"));
    const eventDir = path.join(tempDir, "event");
    await mkdir(eventDir);
    await writeFile(path.join(eventDir, "2024-01-15_12-30-00-front.mp4"), "clip");
    await writeFile(path.join(eventDir, "2024-01-15_12-31-00-back.mp4"), "clip");

    const byCamera = await collectSegmentsByCamera(eventDir);
    expect([...byCamera.keys()].sort()).toEqual(["back", "front"]);
  });

  it("scans a root and returns aggregated results", async () => {
    const setup = await setupScannerEventDir("2024-01-15_12-00-00", [
      "2024-01-15_12-30-00-front.mp4",
      "2024-01-15_12-31-00-front.mp4",
      "2024-01-15_12-30-00-back.mp4",
    ]);
    tempDir = setup.tempDir;

    const result = await scanRoot(tempDir);
    expect(result.totalEvents).toBe(1);
    expect(result.totalCameras).toBe(2);
    expect(result.totalSegments).toBe(3);
  });
});
