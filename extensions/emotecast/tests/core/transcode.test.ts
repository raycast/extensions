import { describe, expect, it } from "vitest";
import type { ImageInfo } from "../../src/core/image";
import {
  needsTranscode,
  planTranscode,
  targetFormat,
} from "../../src/core/transcode";

const gif = (height: number): ImageInfo => ({
  width: height,
  height,
  format: "gif",
});
const png = (height: number): ImageInfo => ({
  width: height,
  height,
  format: "png",
});
const webp = (height: number): ImageInfo => ({
  width: height,
  height,
  format: "webp",
});

describe("targetFormat", () => {
  it("keeps animation in GIF and stills in PNG", () => {
    expect(targetFormat(true)).toBe("gif");
    expect(targetFormat(false)).toBe("png");
  });
});

describe("needsTranscode", () => {
  it("skips work when the download already matches height and format", () => {
    expect(needsTranscode(gif(32), 32, true)).toBe(false);
    expect(needsTranscode(png(128), 128, false)).toBe(false);
  });

  it("transcodes when the height is off, even by a few pixels", () => {
    expect(needsTranscode(gif(108), 128, true)).toBe(true);
    expect(needsTranscode(gif(28), 32, true)).toBe(true);
  });

  it("transcodes when the format is wrong despite a matching height", () => {
    expect(needsTranscode(webp(128), 128, true)).toBe(true);
    expect(needsTranscode(gif(32), 32, false)).toBe(true);
  });

  it("transcodes when the format could not be identified", () => {
    expect(needsTranscode(undefined, 32, true)).toBe(true);
  });
});

describe("planTranscode", () => {
  it("uses ImageMagick for animated WebP, which ffmpeg cannot decode", () => {
    const plan = planTranscode(webp(112), 128, true);
    expect(plan.tool).toBe("magick");
    expect(plan.args("in.webp", "out.gif")).toEqual([
      "in.webp",
      "-coalesce",
      "-resize",
      "x128",
      "-layers",
      "optimize",
      "out.gif",
    ]);
  });

  it("composes partial frames, without which animated WebP renders wrong", () => {
    expect(planTranscode(webp(112), 32, true).args("i", "o")).toContain(
      "-coalesce",
    );
  });

  it("uses ffmpeg for still WebP, which it decodes fine", () => {
    expect(planTranscode(webp(112), 128, false).tool).toBe("ffmpeg");
  });

  it("regenerates the palette for animated GIF to avoid dithering", () => {
    const args = planTranscode(gif(112), 128, true).args("in.gif", "out.gif");
    const filter = args[args.indexOf("-vf") + 1];
    expect(filter).toContain("palettegen");
    expect(filter).toContain("paletteuse");
    expect(filter).toContain("flags=lanczos");
    expect(args).toContain("-loop");
  });

  it("skips palette work and looping for stills", () => {
    const args = planTranscode(png(28), 32, false).args("in.png", "out.png");
    expect(args[args.indexOf("-vf") + 1]).toBe("scale=-1:32:flags=lanczos");
    expect(args).not.toContain("-loop");
  });

  it("scales on height and lets width follow, preserving wide emotes", () => {
    const args = planTranscode(gif(108), 128, true).args("i", "o");
    expect(args[args.indexOf("-vf") + 1]).toContain("scale=-1:128");
  });

  it("falls back to ffmpeg when the format is unknown", () => {
    expect(planTranscode(undefined, 32, true).tool).toBe("ffmpeg");
  });
});
