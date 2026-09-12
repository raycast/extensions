import { describe, expect, it } from "vitest";
import { Icon } from "@raycast/api";
import { getEventDisplayStatus, getEventListIcon } from "../lib/event-status";
import type { EventMergeResult, TeslaEvent } from "../types";

const baseEvent: TeslaEvent = {
  id: "event-1",
  eventDir: "/event",
  sourceRoot: "/root",
  folderName: "2025-09-29_07-01-59",
  totalSegments: 4,
  totalGaps: 0,
  cameras: [],
  readiness: {
    existingState: "complete",
    existingOutputCount: 2,
    mergeableCount: 2,
    pendingMergeCount: 0,
    jobs: [],
  },
};

describe("event-status", () => {
  it("shows scan-time existing state before merge", () => {
    expect(getEventDisplayStatus(baseEvent, new Map(), undefined)).toBe("existing");

    const partialEvent: TeslaEvent = {
      ...baseEvent,
      readiness: {
        ...baseEvent.readiness!,
        existingState: "partial",
      },
    };
    expect(getEventDisplayStatus(partialEvent, new Map(), undefined)).toBe("existing-partial");
  });

  it("shows skipped when merge only skipped existing outputs", () => {
    const result: EventMergeResult = {
      eventDir: baseEvent.eventDir,
      outputs: [
        {
          camera: "front",
          outputPath: "/event/merged/front.mp4",
          segmentCount: 2,
          status: "skipped-existing",
        },
      ],
    };

    expect(getEventDisplayStatus(baseEvent, new Map([[baseEvent.id, result]]), undefined)).toBe("skipped");
  });

  it("shows merged when at least one camera merged", () => {
    const result: EventMergeResult = {
      eventDir: baseEvent.eventDir,
      outputs: [
        {
          camera: "front",
          outputPath: "/event/merged/front.mp4",
          segmentCount: 2,
          status: "merged",
        },
        {
          camera: "back",
          outputPath: "/event/merged/back.mp4",
          segmentCount: 2,
          status: "skipped-existing",
        },
      ],
    };

    expect(getEventDisplayStatus(baseEvent, new Map([[baseEvent.id, result]]), undefined)).toBe("merged");
  });

  it("shows merging, failed, and partial post-merge states", () => {
    expect(getEventDisplayStatus(baseEvent, new Map(), baseEvent.id)).toBe("merging");

    const failedResult: EventMergeResult = {
      eventDir: baseEvent.eventDir,
      outputs: [
        {
          camera: "front",
          outputPath: "/event/merged/front.mp4",
          segmentCount: 2,
          status: "failed",
          errorMessage: "boom",
        },
      ],
    };
    expect(getEventDisplayStatus(baseEvent, new Map([[baseEvent.id, failedResult]]), undefined)).toBe("failed");

    const partialResult: EventMergeResult = {
      eventDir: baseEvent.eventDir,
      outputs: [
        {
          camera: "front",
          outputPath: "/event/merged/front.mp4",
          segmentCount: 2,
          status: "merged",
        },
        {
          camera: "back",
          outputPath: "/event/merged/back.mp4",
          segmentCount: 2,
          status: "failed",
          errorMessage: "boom",
        },
      ],
    };
    expect(getEventDisplayStatus(baseEvent, new Map([[baseEvent.id, partialResult]]), undefined)).toBe("partial");
  });

  it("returns pending when no readiness or merge result exists", () => {
    const pendingEvent: TeslaEvent = {
      id: baseEvent.id,
      eventDir: baseEvent.eventDir,
      sourceRoot: baseEvent.sourceRoot,
      folderName: baseEvent.folderName,
      cameras: baseEvent.cameras,
      totalSegments: baseEvent.totalSegments,
      totalGaps: baseEvent.totalGaps,
    };
    expect(getEventDisplayStatus(pendingEvent, new Map(), undefined)).toBe("pending");
  });

  it("maps display statuses to list icons", () => {
    expect(getEventListIcon("existing").source).toBe(Icon.CheckCircle);
    expect(getEventListIcon("existing-partial").source).toBe(Icon.CircleProgress100);
    expect(getEventListIcon("pending").source).toBe(Icon.Video);
    expect(getEventListIcon("failed").source).toBe(Icon.XMarkCircle);
    expect(getEventListIcon("merging").source).toBe(Icon.CircleProgress25);
  });
});
