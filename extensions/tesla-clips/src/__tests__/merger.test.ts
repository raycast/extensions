import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClipSegment, MergeOptions, TeslaEvent } from "../types";

const fsMocks = vi.hoisted(() => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  stat: vi.fn(),
  utimes: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock("node:fs", () => ({
  promises: fsMocks,
}));

vi.mock("../lib/exec", () => ({
  execFileAsync: vi.fn(),
}));

import { trash } from "@raycast/api";
import { execFileAsync } from "../lib/exec";
import { escapeConcatFilePath, mergeCameraSegments, mergeEvent } from "../lib/merger";

const baseOptions: MergeOptions = {
  ffmpegPath: "/usr/bin/ffmpeg",
  overwriteExisting: false,
  deleteSourceSegmentsAfterMerge: false,
};

const segments: ClipSegment[] = [
  { timestamp: "2024-01-15_12-30-00", camera: "front", filePath: "/event/front-a.mp4" },
  { timestamp: "2024-01-15_12-31-00", camera: "front", filePath: "/event/front-b.mp4" },
];

function createStatResult(size: number) {
  return {
    size,
    atime: new Date(),
    mtime: new Date(),
    isFile: () => true,
  };
}

function mockMergedOutputStatBehavior(behavior: "missing" | "valid" | "corrupt"): void {
  const mergedStatCounts = new Map<string, number>();

  fsMocks.stat.mockImplementation(async (filePath: string) => {
    if (!filePath.includes("/merged/")) {
      return createStatResult(1024);
    }

    const callCount = (mergedStatCounts.get(filePath) ?? 0) + 1;
    mergedStatCounts.set(filePath, callCount);

    if (behavior === "valid") {
      return createStatResult(5000);
    }

    if (callCount === 1) {
      if (behavior === "corrupt") {
        return createStatResult(48);
      }

      throw new Error("missing");
    }

    return createStatResult(1024);
  });
}

describe("escapeConcatFilePath", () => {
  it("backslash-escapes apostrophes, spaces, and backslashes for ffmpeg concat", () => {
    expect(escapeConcatFilePath("/Users/foo's/clips/a.mp4")).toBe("/Users/foo\\'s/clips/a.mp4");
    expect(escapeConcatFilePath("/Users/foo bar/a.mp4")).toBe("/Users/foo\\ bar/a.mp4");
    expect(escapeConcatFilePath(String.raw`C:\clips\a.mp4`)).toBe(String.raw`C:\\clips\\a.mp4`);
  });
});

describe("merger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fsMocks.mkdir.mockResolvedValue(undefined);
    fsMocks.writeFile.mockResolvedValue(undefined);
    fsMocks.utimes.mockResolvedValue(undefined);
    fsMocks.unlink.mockResolvedValue(undefined);
    vi.mocked(execFileAsync).mockResolvedValue({ stdout: "", stderr: "" });
    mockMergedOutputStatBehavior("missing");
  });

  it("skips cameras with a single segment", async () => {
    const result = await mergeCameraSegments("front", [segments[0]!], "/event/merged/front.mp4", baseOptions);
    expect(result.status).toBe("skipped-single");
    expect(execFileAsync).not.toHaveBeenCalled();
  });

  it("skips existing outputs when overwrite is disabled", async () => {
    mockMergedOutputStatBehavior("valid");

    const result = await mergeCameraSegments("front", segments, "/event/merged/front.mp4", baseOptions);
    expect(result.status).toBe("skipped-existing");
    expect(execFileAsync).not.toHaveBeenCalled();
  });

  it("re-merges corrupt outputs that are too small", async () => {
    mockMergedOutputStatBehavior("corrupt");

    const result = await mergeCameraSegments("front", segments, "/event/merged/front.mp4", baseOptions);
    expect(result.status).toBe("merged");
    expect(execFileAsync).toHaveBeenCalled();
  });

  it("merges segments and preserves timestamps", async () => {
    const result = await mergeCameraSegments("front", segments, "/event/merged/front.mp4", baseOptions);
    expect(result.status).toBe("merged");
    expect(execFileAsync).toHaveBeenCalled();
    expect(fsMocks.utimes).toHaveBeenCalled();
  });

  it("writes ffmpeg-safe concat lines for paths with apostrophes", async () => {
    const apostropheSegments: ClipSegment[] = [
      {
        timestamp: "2024-01-15_12-30-00",
        camera: "front",
        filePath: "/Volumes/O'Brien/TeslaCam/front-a.mp4",
      },
      {
        timestamp: "2024-01-15_12-31-00",
        camera: "front",
        filePath: "/Volumes/O'Brien/TeslaCam/front-b.mp4",
      },
    ];

    const result = await mergeCameraSegments("front", apostropheSegments, "/event/merged/front.mp4", baseOptions);
    expect(result.status).toBe("merged");

    const concatContent = String(fsMocks.writeFile.mock.calls[0]?.[1]);
    expect(concatContent).toContain("file /Volumes/O\\'Brien/TeslaCam/front-a.mp4");
    expect(concatContent).toContain("file /Volumes/O\\'Brien/TeslaCam/front-b.mp4");
    expect(concatContent).not.toContain("'\\''");
  });

  it("returns failed status when output validation fails", async () => {
    fsMocks.stat.mockImplementation(async (filePath: string) =>
      createStatResult(filePath.includes("/merged/") ? 0 : 1024),
    );

    const result = await mergeCameraSegments("front", segments, "/event/merged/front.mp4", baseOptions);
    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("Output file is empty");
  });

  it("trashes source segments when enabled", async () => {
    await mergeCameraSegments("front", segments, "/event/merged/front.mp4", {
      ...baseOptions,
      deleteSourceSegmentsAfterMerge: true,
    });
    expect(trash).toHaveBeenCalledWith(segments.map((segment) => segment.filePath));
  });

  it("merges when overwriteOutputs includes the camera", async () => {
    mockMergedOutputStatBehavior("valid");

    const result = await mergeCameraSegments(
      "front",
      segments,
      "/event/merged/front.mp4",
      {
        ...baseOptions,
        overwriteOutputs: new Set(["/Volumes/TeslaCam/event-1::front"]),
      },
      "/Volumes/TeslaCam/event-1",
    );
    expect(result.status).toBe("merged");
    expect(execFileAsync).toHaveBeenCalled();
  });

  it("merges all cameras for an event", async () => {
    const event: TeslaEvent = {
      id: "event-1",
      eventDir: "/Volumes/TeslaCam/event-1",
      sourceRoot: "/Volumes/TeslaCam",
      folderName: "event-1",
      totalSegments: 4,
      totalGaps: 0,
      cameras: [
        {
          camera: "front",
          segments,
          gaps: [],
        },
        {
          camera: "back",
          segments: [
            { timestamp: "2024-01-15_12-30-00", camera: "back", filePath: "/event/back-a.mp4" },
            { timestamp: "2024-01-15_12-31-00", camera: "back", filePath: "/event/back-b.mp4" },
          ],
          gaps: [],
        },
      ],
    };

    const result = await mergeEvent(event, baseOptions);
    expect(result.outputs).toHaveLength(2);
    expect(result.outputs.every((output) => output.status === "merged")).toBe(true);
  });
});
