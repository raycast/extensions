import { describe, it, expect } from "vitest";
import { PROGRESS_TAG, PROGRESS_TEMPLATE, parseYtdlpLine } from "../src/lib/progress";

describe("PROGRESS_TEMPLATE", () => {
  it("is a download-scoped template tagged with the sentinel", () => {
    expect(PROGRESS_TEMPLATE.startsWith(`download:${PROGRESS_TAG}`)).toBe(true);
    expect(PROGRESS_TEMPLATE).toContain("%(progress.speed)s");
  });
});

describe("parseYtdlpLine", () => {
  it("reads raw byte counts, speed and ETA and derives the percentage", () => {
    expect(parseYtdlpLine(`${PROGRESS_TAG}5000:20000:NA:1000:15`)).toEqual({
      type: "progress",
      progress: { percent: 25, downloadedBytes: 5000, totalBytes: 20000, speed: 1000, eta: 15 },
    });
  });

  it("falls back to the size estimate when no exact total is published", () => {
    const event = parseYtdlpLine(`${PROGRESS_TAG}500:NA:1000.0:NA:NA`);
    expect(event).toEqual({
      type: "progress",
      progress: { percent: 50, downloadedBytes: 500, totalBytes: 1000, speed: undefined, eta: undefined },
    });
  });

  it("leaves the percentage out when the total is unknown", () => {
    const event = parseYtdlpLine(`${PROGRESS_TAG}500:NA:NA:250:NA`);
    expect(event).toMatchObject({ type: "progress", progress: { percent: undefined, downloadedBytes: 500 } });
  });

  it("still understands the human progress line", () => {
    expect(parseYtdlpLine("[download]  42.5% of ~ 10.00MiB at 2.10MiB/s ETA 00:05")).toEqual({
      type: "progress",
      progress: { percent: 42.5 },
    });
  });

  it("counts the streams from the format selection line", () => {
    expect(parseYtdlpLine("[info] uJ70iGerYzE: Downloading 1 format(s): 137+140")).toEqual({
      type: "formats",
      streams: 2,
    });
    expect(parseYtdlpLine("[info] abc: Downloading 1 format(s): 22")).toEqual({ type: "formats", streams: 1 });
  });

  it("detects stream starts and skips", () => {
    expect(parseYtdlpLine("[download] Destination: /out/a.f137.mp4")).toEqual({ type: "stream-start" });
    expect(parseYtdlpLine("[download] /out/a.mp4 has already been downloaded")).toEqual({ type: "stream-skipped" });
  });

  it("classifies post-processors", () => {
    expect(parseYtdlpLine('[Merger] Merging formats into "/out/a.mp4"')).toEqual({
      type: "postprocess",
      step: "merge",
    });
    expect(parseYtdlpLine("[ExtractAudio] Destination: /out/a.mp3")).toEqual({
      type: "postprocess",
      step: "extract-audio",
    });
    expect(parseYtdlpLine("[VideoRemuxer] Remuxing video from webm to mp4")).toEqual({
      type: "postprocess",
      step: "other",
    });
  });

  it("ignores everything else, including the filepath sentinel", () => {
    expect(parseYtdlpLine("")).toBeUndefined();
    expect(parseYtdlpLine("[youtube] Extracting URL: https://youtu.be/x")).toBeUndefined();
    expect(parseYtdlpLine("THE-DOWNLOADER-FILEPATH:/out/a.mp4")).toBeUndefined();
  });
});
