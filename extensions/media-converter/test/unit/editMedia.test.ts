import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAtempoFilter, buildEditProcessSpec } from "../../src/utils/editMedia";

describe("edit command construction", () => {
  it("builds resize and crop filters without a shell", () => {
    const spec = buildEditProcessSpec(
      "/ffmpeg",
      "/tmp/in file.mp4",
      "/tmp/out.mp4",
      { operation: "resize-crop", width: 1280, cropWidth: 1000, cropHeight: 700, cropX: 10, cropY: 20 },
      { hasAudio: true, hasVideo: true },
    );
    assert.equal(spec.command, "/ffmpeg");
    assert.deepEqual(spec.args.slice(0, 4), ["-i", "/tmp/in file.mp4", "-vf", "crop=1000:700:10:20,scale=1280:-1"]);
  });

  it("chains atempo filters for speeds outside a single filter range", () => {
    assert.equal(buildAtempoFilter(4), "atempo=2,atempo=2");
    assert.equal(buildAtempoFilter(0.25), "atempo=0.5,atempo=0.5");
  });

  it("rejects missing audio extraction streams", () => {
    assert.throws(
      () =>
        buildEditProcessSpec(
          "/ffmpeg",
          "/tmp/in.mp4",
          "/tmp/out.mp3",
          { operation: "extract-audio", audioFormat: ".mp3" },
          { hasAudio: false, hasVideo: true },
        ),
      /no audio stream/,
    );
  });
});
