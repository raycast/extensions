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
    assert.equal(buildAtempoFilter(10), "atempo=2,atempo=2,atempo=2,atempo=1.25");
    assert.equal(buildAtempoFilter(40), "atempo=2,atempo=2,atempo=2,atempo=2,atempo=2,atempo=1.25");
  });

  it("accepts high speeds while keeping each audio tempo factor within 0.5–2", () => {
    for (const speed of [0.25, 4, 8, 10, 20, 40]) {
      const { args } = buildEditProcessSpec(
        "/ffmpeg",
        "/tmp/in.mp4",
        "/tmp/out.mp4",
        { operation: "speed", speed },
        { hasAudio: true, hasVideo: true },
      );
      const factors = args[args.indexOf("-filter:a") + 1].split(",").map((filter) => Number(filter.split("=")[1]));
      assert.ok(factors.every((factor) => factor >= 0.5 && factor <= 2));
      assert.equal(
        factors.reduce((product, factor) => product * factor, 1),
        speed,
      );
    }
  });

  it("rejects out-of-range and non-finite speeds", () => {
    for (const speed of [0, -1, 0.24, 40.01, Number.NaN, Infinity]) {
      assert.throws(
        () =>
          buildEditProcessSpec(
            "/ffmpeg",
            "/tmp/in.mp4",
            "/tmp/out.mp4",
            { operation: "speed", speed },
            { hasAudio: true, hasVideo: true },
          ),
        /Speed must be between 0.25× and 40×/,
      );
    }
  });

  it("combines speed, frame rate, and removal of every audio stream", () => {
    const { args } = buildEditProcessSpec(
      "/ffmpeg",
      "/tmp/in.mp4",
      "/tmp/out.mp4",
      { operation: "speed", speed: 40, frameRate: 60, removeAudio: true },
      { hasAudio: true, hasVideo: true },
    );
    assert.equal(args[args.indexOf("-filter:v") + 1], "setpts=PTS/40,fps=60");
    assert.ok(args.includes("-an"));
    assert.ok(!args.includes("-filter:a"));
    assert.ok(!args.includes("-c:a"));
  });

  it("changes frame rate with or without audio", () => {
    for (const frameRate of [24, 30, 60]) {
      for (const hasAudio of [false, true]) {
        const { args } = buildEditProcessSpec(
          "/ffmpeg",
          "/tmp/in.mp4",
          "/tmp/out.mp4",
          { operation: "frame-rate", frameRate },
          { hasAudio, hasVideo: true },
        );
        assert.equal(args[args.indexOf("-vf") + 1], `fps=${frameRate}`);
        assert.equal(args.includes("-c:a"), hasAudio);
        assert.ok(!args.includes("-an"));
      }
    }
  });

  it("rejects unsupported frame rates in both frame-rate and speed operations", () => {
    for (const frameRate of [0, 25, 29.97, -1, Number.NaN, Infinity]) {
      for (const operation of ["speed", "frame-rate"] as const) {
        assert.throws(
          () =>
            buildEditProcessSpec(
              "/ffmpeg",
              "/tmp/in.mp4",
              "/tmp/out.mp4",
              { operation, speed: 2, frameRate },
              { hasAudio: true, hasVideo: true },
            ),
          /Output frame rate must be 24, 30, or 60 fps/,
        );
      }
    }
  });

  it("removes audio without changing video timing", () => {
    const { args } = buildEditProcessSpec(
      "/ffmpeg",
      "/tmp/in.mp4",
      "/tmp/out.mp4",
      { operation: "remove-audio" },
      { hasAudio: true, hasVideo: true },
    );
    assert.ok(args.includes("-an"));
    assert.ok(!args.includes("-filter:v"));
    assert.ok(!args.includes("-filter:a"));
    assert.ok(!args.includes("-c:a"));
  });

  it("rejects video-only operations for audio, album art, and still images", () => {
    for (const [inputPath, hasVideo] of [
      ["/tmp/in.wav", false],
      ["/tmp/in.mp3", true],
      ["/tmp/in.png", true],
    ] as const) {
      for (const request of [
        { operation: "frame-rate", frameRate: 30 },
        { operation: "remove-audio" },
        { operation: "speed", speed: 2, frameRate: 60 },
        { operation: "speed", speed: 2, removeAudio: true },
      ] as const) {
        assert.throws(
          () => buildEditProcessSpec("/ffmpeg", inputPath, "/tmp/out.mp4", request, { hasAudio: true, hasVideo }),
          /require a video file/,
        );
      }
    }
  });

  it("keeps high-speed audio-only processing and silent video processing supported", () => {
    for (const hasVideo of [false, true]) {
      const { args } = buildEditProcessSpec(
        "/ffmpeg",
        hasVideo ? "/tmp/in.mp4" : "/tmp/in.wav",
        hasVideo ? "/tmp/out.mp4" : "/tmp/out.mp3",
        { operation: "speed", speed: 40 },
        { hasAudio: !hasVideo, hasVideo },
      );
      assert.equal(args.includes("-filter:a"), !hasVideo);
      assert.equal(args.includes("-filter:v"), hasVideo);
    }
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

  it("rejects resize and crop for audio-only inputs", () => {
    assert.throws(
      () =>
        buildEditProcessSpec(
          "/ffmpeg",
          "/tmp/in.mp3",
          "/tmp/out.mp3",
          { operation: "resize-crop", width: 1280 },
          { hasAudio: true, hasVideo: false },
        ),
      /require an image or video stream/,
    );
  });

  it("rejects invalid crop dimensions even when resize is valid", () => {
    for (const [request, expected] of [
      [{ cropWidth: 0, cropHeight: 700 }, /Crop width must be a positive whole number/],
      [{ cropWidth: 1000, cropHeight: Number.NaN }, /Crop height must be a positive whole number/],
    ] as const) {
      assert.throws(
        () =>
          buildEditProcessSpec(
            "/ffmpeg",
            "/tmp/in.mp4",
            "/tmp/out.mp4",
            { operation: "resize-crop", width: 1280, ...request },
            { hasAudio: true, hasVideo: true },
          ),
        expected,
      );
    }
  });

  it("requires both crop dimensions when crop is requested", () => {
    assert.throws(
      () =>
        buildEditProcessSpec(
          "/ffmpeg",
          "/tmp/in.mp4",
          "/tmp/out.mp4",
          { operation: "resize-crop", width: 1280, cropWidth: 1000 },
          { hasAudio: true, hasVideo: true },
        ),
      /both crop width and crop height/,
    );
  });

  it("rejects invalid resize dimensions when another edit value is valid", () => {
    for (const [request, expected] of [
      [{ width: 0, height: 720 }, /Width must be a positive whole number/],
      [{ width: 1280, height: Number.NaN }, /Height must be a positive whole number/],
      [{ width: 0, cropWidth: 1000, cropHeight: 700 }, /Width must be a positive whole number/],
    ] as const) {
      assert.throws(
        () =>
          buildEditProcessSpec(
            "/ffmpeg",
            "/tmp/in.mp4",
            "/tmp/out.mp4",
            { operation: "resize-crop", ...request },
            { hasAudio: true, hasVideo: true },
          ),
        expected,
      );
    }
  });
});
