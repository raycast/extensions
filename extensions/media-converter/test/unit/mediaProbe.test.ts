import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMediaInspection } from "../../src/utils/mediaProbe";

const SAMPLE = `
Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/tmp/a.mp4':
  Metadata:
    title           : Demo Clip
  Duration: 00:01:02.50, start: 0.000000, bitrate: 1842 kb/s
  Stream #0:0(eng): Video: h264 (High), yuv420p, 1920x1080, 1700 kb/s, 29.97 fps
  Stream #0:1(eng): Audio: aac (LC), 48000 Hz, stereo, fltp, 128 kb/s
`;

describe("parseMediaInspection", () => {
  it("extracts container, duration, metadata, and structured streams", () => {
    const result = parseMediaInspection(SAMPLE, "/tmp/a.mp4");
    assert.equal(result.container, "mov,mp4,m4a,3gp,3g2,mj2");
    assert.equal(result.durationSec, 62.5);
    assert.equal(result.bitrateKbps, 1842);
    assert.equal(result.metadata.title, "Demo Clip");
    assert.deepEqual(result.streams[0], {
      index: 0,
      type: "video",
      codec: "h264",
      language: "eng",
      width: 1920,
      height: 1080,
      frameRate: 29.97,
      bitrateKbps: 1700,
      pixelFormat: "yuv420p",
    });
    assert.equal(result.streams[1].sampleRate, 48000);
    assert.equal(result.streams[1].channels, "stereo");
  });
});
