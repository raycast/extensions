import { describe, expect, it } from "vitest";
import { buildPcmFfplayArgs, parsePcmStreamHeaders } from "./pcm-stream";

function pcmHeaders(overrides: Record<string, string> = {}): Headers {
  return new Headers({
    "content-type": "audio/raw",
    "x-tts-mode": "stream-pcm",
    "x-tts-sample-rate": "24000",
    "x-tts-channels": "1",
    "x-tts-sample-width": "2",
    "x-tts-pcm-format": "s16le",
    ...overrides,
  });
}

describe("parsePcmStreamHeaders", () => {
  it("parses valid PCM stream headers", () => {
    expect(parsePcmStreamHeaders(pcmHeaders())).toEqual({
      pcmFormat: "s16le",
      sampleRate: 24000,
      channels: 1,
    });
  });

  it("rejects non-raw content types", () => {
    expect(parsePcmStreamHeaders(pcmHeaders({ "content-type": "audio/mpeg" }))).toBeNull();
  });

  it("rejects missing or invalid stream mode", () => {
    expect(parsePcmStreamHeaders(pcmHeaders({ "x-tts-mode": "stream" }))).toBeNull();
    expect(parsePcmStreamHeaders(pcmHeaders({ "x-tts-mode": "" }))).toBeNull();
  });

  it("rejects unsupported PCM formats", () => {
    expect(parsePcmStreamHeaders(pcmHeaders({ "x-tts-pcm-format": "f32le" }))).toBeNull();
  });

  it("rejects invalid sample rate or channel counts", () => {
    expect(parsePcmStreamHeaders(pcmHeaders({ "x-tts-sample-rate": "0" }))).toBeNull();
    expect(parsePcmStreamHeaders(pcmHeaders({ "x-tts-sample-rate": "24000hz" }))).toBeNull();
    expect(parsePcmStreamHeaders(pcmHeaders({ "x-tts-channels": "not-a-number" }))).toBeNull();
  });
});

describe("buildPcmFfplayArgs", () => {
  it("builds ffplay stdin args for PCM playback", () => {
    expect(
      buildPcmFfplayArgs({
        pcmFormat: "s16le",
        sampleRate: 24000,
        channels: 1,
      }),
    ).toEqual([
      "-nodisp",
      "-autoexit",
      "-loglevel",
      "error",
      "-f",
      "s16le",
      "-sample_rate",
      "24000",
      "-ch_layout",
      "mono",
      "-i",
      "-",
    ]);
  });

  it("uses stereo channel layout for two-channel PCM playback", () => {
    expect(
      buildPcmFfplayArgs({
        pcmFormat: "s16le",
        sampleRate: 48000,
        channels: 2,
      }),
    ).toContain("stereo");
  });
});
