import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseProgressBlock, parseDurationFromStderr, injectGlobalFlags } from "../../src/utils/ffmpegRun";

describe("parseProgressBlock", () => {
  const sampleBlock = [
    "bitrate=1234.5kbits/s",
    "total_size=100000",
    "out_time_us=15000000",
    "out_time_ms=15000000",
    "out_time=00:00:15.000000",
    "dup_frames=0",
    "drop_frames=0",
    "speed=1.25x",
    "fps=30.0",
    "progress=continue",
  ].join("\n");

  it("returns null for blocks without a parseable out_time", () => {
    const block = "bitrate=1234.5\nprogress=continue";
    assert.equal(parseProgressBlock(block, 60, Date.now()), null);
  });

  it("computes percent from processed / total seconds", () => {
    const info = parseProgressBlock(sampleBlock, 60, Date.now());
    assert.ok(info);
    assert.equal(info!.processedSec, 15);
    assert.equal(info!.totalSec, 60);
    assert.equal(info!.percent, 25);
  });

  it("reports 0% when total duration is unknown", () => {
    const info = parseProgressBlock(sampleBlock, undefined, Date.now());
    assert.ok(info);
    assert.equal(info!.percent, 0);
  });

  it("clamps percent to [0, 100] when processed exceeds total", () => {
    const block = "out_time_ms=70000000\nspeed=1x\nprogress=continue";
    const info = parseProgressBlock(block, 60, Date.now());
    assert.ok(info);
    assert.equal(info!.percent, 100);
  });

  it("extracts fps and speed", () => {
    const info = parseProgressBlock(sampleBlock, 60, Date.now());
    assert.ok(info);
    assert.equal(info!.fps, 30);
    assert.equal(info!.speed, 1.25);
  });

  it("derives an ETA using reported speed when available", () => {
    // 15s processed of 60s total at 1.25x => remaining=45s, ETA = 45/1.25 = 36s
    const info = parseProgressBlock(sampleBlock, 60, Date.now());
    assert.ok(info);
    assert.ok(info!.etaSec !== undefined);
    assert.ok(Math.abs(info!.etaSec! - 36) < 0.1);
  });

  it("falls back to out_time timestamp when out_time_ms is absent", () => {
    const block = "out_time=00:01:00.000\nspeed=1x\nprogress=continue";
    const info = parseProgressBlock(block, 300, Date.now());
    assert.ok(info);
    assert.equal(info!.processedSec, 60);
    assert.equal(info!.percent, 20);
  });
});

describe("parseDurationFromStderr", () => {
  it("extracts duration from a standard FFmpeg Duration line", () => {
    const stderr = "  Duration: 00:01:23.45, start: 0.000000, bitrate: 5000 kb/s\n";
    assert.equal(parseDurationFromStderr(stderr), 83.45);
  });

  it("handles integer-second durations", () => {
    const stderr = "Duration: 01:02:03, ...";
    assert.equal(parseDurationFromStderr(stderr), 3723);
  });

  it("returns null when no Duration line is present", () => {
    assert.equal(parseDurationFromStderr("totally unrelated output"), null);
  });

  it("returns null for malformed duration values", () => {
    assert.equal(parseDurationFromStderr("Duration: ab:cd:ef, ..."), null);
  });
});

describe("injectGlobalFlags", () => {
  it("injects after a quoted binary path", () => {
    const cmd = `"/path/with spaces/ffmpeg" -i "in.mp4" out.mp4`;
    const out = injectGlobalFlags(cmd, "-progress pipe:1 -nostats");
    assert.equal(out, `"/path/with spaces/ffmpeg" -progress pipe:1 -nostats -i "in.mp4" out.mp4`);
  });

  it("injects after an unquoted binary path", () => {
    const cmd = `ffmpeg -i in.mp4 out.mp4`;
    const out = injectGlobalFlags(cmd, "-progress pipe:1 -nostats");
    assert.equal(out, `ffmpeg -progress pipe:1 -nostats -i in.mp4 out.mp4`);
  });

  it("appends flags when command has no spaces (degenerate case)", () => {
    assert.equal(injectGlobalFlags("ffmpeg", "-nostats"), "ffmpeg -nostats");
  });
});
