import { describe, expect, it } from "vitest";
import type { TeslaEvent } from "../types";
import { buildEventDetailMarkdown, pickPreviewSegment, thumbnailPathToMarkdownUri } from "../lib/thumbnail";

function createEvent(): TeslaEvent {
  return {
    id: "event-1",
    eventDir: "/Volumes/TeslaCam/event",
    sourceRoot: "/Volumes/TeslaCam",
    folderName: "2025-09-29_07-01-59",
    cameras: [
      {
        camera: "back",
        segments: [{ timestamp: "2025-09-29_07-01-59", camera: "back", filePath: "/event/back.mp4" }],
        gaps: [],
      },
      {
        camera: "front",
        segments: [{ timestamp: "2025-09-29_07-01-59", camera: "front", filePath: "/event/front.mp4" }],
        gaps: [],
      },
    ],
    totalSegments: 2,
    totalGaps: 0,
  };
}

describe("thumbnail", () => {
  it("prefers the front camera for preview thumbnails", () => {
    expect(pickPreviewSegment(createEvent())?.filePath).toBe("/event/front.mp4");
  });

  it("encodes local thumbnail paths for markdown", () => {
    expect(thumbnailPathToMarkdownUri("/tmp/tesla preview.jpg")).toBe("file:///tmp/tesla%20preview.jpg");
  });

  it("builds detail markdown with an optional preview image", () => {
    expect(buildEventDetailMarkdown("/tmp/preview.jpg")).toContain("![Front camera preview](file:///tmp/preview.jpg)");
    expect(buildEventDetailMarkdown()).not.toContain("![Front camera preview]");
  });
});
