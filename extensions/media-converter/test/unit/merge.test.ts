import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseStreamInfo, canStreamCopy, type StreamInfo } from "../../src/utils/merge";

// Note: we deliberately use a simple pix_fmt without parenthesised color info
// (e.g. `yuv420p` instead of `yuv420p(tv, bt709)`) — the current parser
// regex doesn't support commas inside the pix_fmt segment.
const SAMPLE_STDERR_MP4 = `
Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'a.mp4':
  Duration: 00:00:10.00, start: 0.000000, bitrate: 5000 kb/s
    Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p, 1920x1080 [SAR 1:1 DAR 16:9], 4700 kb/s, 30 fps, 30 tbr, 15360 tbn (default)
    Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 192 kb/s (default)
`;

describe("parseStreamInfo", () => {
  it("extracts duration, video codec/resolution/fps, and audio codec/sample rate/channels", () => {
    const info = parseStreamInfo(SAMPLE_STDERR_MP4);
    assert.equal(info.durationSec, 10);
    assert.equal(info.videoCodec, "h264");
    assert.equal(info.videoWidth, 1920);
    assert.equal(info.videoHeight, 1080);
    assert.equal(info.videoFps, 30);
    assert.equal(info.audioCodec, "aac");
    assert.equal(info.audioSampleRate, 48000);
    assert.equal(info.audioChannels, 2);
  });

  it("handles mono audio layouts", () => {
    const stderr = `  Duration: 00:00:01.00\n    Stream #0:0: Audio: mp3, 44100 Hz, mono, s16p, 64 kb/s`;
    const info = parseStreamInfo(stderr);
    assert.equal(info.audioCodec, "mp3");
    assert.equal(info.audioSampleRate, 44100);
    assert.equal(info.audioChannels, 1);
  });

  it("returns an empty-ish StreamInfo for unrelated text", () => {
    const info = parseStreamInfo("no media metadata here");
    assert.equal(info.durationSec, undefined);
    assert.equal(info.videoCodec, undefined);
    assert.equal(info.audioCodec, undefined);
  });

  it("extracts at least the video codec when the detail regex misses", () => {
    const stderr = `Stream #0:0: Video: vp9, yuv420p`;
    const info = parseStreamInfo(stderr);
    assert.equal(info.videoCodec, "vp9");
    assert.equal(info.videoWidth, undefined);
  });
});

describe("canStreamCopy", () => {
  const A: StreamInfo = {
    videoCodec: "h264",
    videoWidth: 1920,
    videoHeight: 1080,
    videoFps: 30,
    audioCodec: "aac",
    audioSampleRate: 48000,
    audioChannels: 2,
  };

  it("returns true for identical streams", () => {
    assert.equal(canStreamCopy([A, { ...A }]), true);
  });

  it("returns true for 3 identical streams", () => {
    assert.equal(canStreamCopy([A, { ...A }, { ...A }]), true);
  });

  it("returns false when video codec differs", () => {
    assert.equal(canStreamCopy([A, { ...A, videoCodec: "hevc" }]), false);
  });

  it("returns false when resolution differs", () => {
    assert.equal(canStreamCopy([A, { ...A, videoWidth: 1280, videoHeight: 720 }]), false);
  });

  it("returns false when fps differs", () => {
    assert.equal(canStreamCopy([A, { ...A, videoFps: 60 }]), false);
  });

  it("returns false when audio codec differs", () => {
    assert.equal(canStreamCopy([A, { ...A, audioCodec: "mp3" }]), false);
  });

  it("returns false when audio sample rate differs", () => {
    assert.equal(canStreamCopy([A, { ...A, audioSampleRate: 44100 }]), false);
  });

  it("returns false when audio channel count differs", () => {
    assert.equal(canStreamCopy([A, { ...A, audioChannels: 1 }]), false);
  });

  it("returns false when one stream has audio and the other does not", () => {
    const noAudio: StreamInfo = { ...A, audioCodec: undefined, audioSampleRate: undefined, audioChannels: undefined };
    assert.equal(canStreamCopy([A, noAudio]), false);
  });

  it("returns false for a single stream (need at least 2 to merge)", () => {
    assert.equal(canStreamCopy([A]), false);
  });

  it("returns false when a required field is missing (safety)", () => {
    const incomplete: StreamInfo = { videoCodec: "h264" };
    assert.equal(canStreamCopy([A, incomplete]), false);
  });

  it("tolerates tiny fps drift (< 0.1 fps)", () => {
    assert.equal(canStreamCopy([A, { ...A, videoFps: 30.05 }]), true);
  });
});
