import { Icon } from "@raycast/api";
import { describe, expect, it } from "vitest";
import {
  formatCameraSummary,
  formatEventClipCount,
  formatEventListDate,
  formatEventSearchKeywords,
  formatEventTimeOnly,
  formatEventTitle,
  formatMergeStatus,
  parseEventFolderDate,
} from "../lib/format-event";
import type { CameraGroup, TeslaEvent } from "../types";

function createEvent(overrides: Partial<TeslaEvent> = {}): TeslaEvent {
  return {
    id: "event-1",
    eventDir: "/Volumes/TeslaCam/event",
    sourceRoot: "/Volumes/TeslaCam",
    folderName: "2025-09-29_07-01-59",
    cameras: [
      { camera: "front", segments: [], gaps: [] },
      { camera: "back", segments: [], gaps: [] },
    ],
    totalSegments: 6,
    totalGaps: 0,
    ...overrides,
  };
}

describe("format-event", () => {
  it("parses Tesla event folder timestamps", () => {
    const date = parseEventFolderDate("2025-09-29_07-01-59");
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2025);
    expect(date?.getMonth()).toBe(8);
    expect(date?.getDate()).toBe(29);
  });

  it("formats event titles for list rows", () => {
    expect(formatEventTitle("2025-09-29_07-01-59")).toContain("Sep");
    expect(formatEventTitle("2025-09-29_07-01-59")).toContain("2025");
  });

  it("formats compact list dates like Sep 9, 2025", () => {
    expect(formatEventListDate("2025-09-29_07-01-59")).toBe("Sep 29, 2025");
    expect(formatEventListDate("2025-09-09_07-01-59")).toBe("Sep 9, 2025");
  });

  it("formats time-only labels for day drill-down rows", () => {
    expect(formatEventTimeOnly("2025-09-29_07-01-59")).not.toContain("Sep");
    expect(formatEventTimeOnly("2025-09-29_07-01-59")).not.toContain("2025");
  });

  it("formats clip counts for list subtitles", () => {
    expect(formatEventClipCount(12)).toBe("12 clips");
    expect(formatEventClipCount(1)).toBe("1 clip");
  });

  it("builds search keywords from folder and camera names", () => {
    expect(formatEventSearchKeywords(createEvent())).toEqual(["2025-09-29_07-01-59", "front", "back"]);
  });

  it("summarizes camera names", () => {
    const cameras: CameraGroup[] = [
      { camera: "front", segments: [], gaps: [] },
      { camera: "left_repeater", segments: [], gaps: [] },
    ];
    expect(formatCameraSummary(cameras)).toBe("Front · Left");
  });

  it("formats merge statuses for display", () => {
    expect(formatMergeStatus("merged")).toBe("Merged");
    expect(formatMergeStatus("skipped-existing")).toBe("Already merged");
  });

  it("maps camera icons", async () => {
    const { getCameraIcon } = await import("../lib/format-event");
    expect(getCameraIcon("front")).toBe(Icon.ArrowUp);
    expect(getCameraIcon("back")).toBe(Icon.ArrowDown);
  });
});
