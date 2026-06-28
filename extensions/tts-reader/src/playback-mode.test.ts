import { describe, expect, it } from "vitest";
import { parseSpeed, resolvePlaybackMode, shouldProbeFfplay } from "../src/playback-mode";

describe("resolvePlaybackMode", () => {
  it("uses buffered mode for non-gateway servers", () => {
    expect(
      resolvePlaybackMode({
        isGateway: false,
        hasCustomPath: false,
        saveAudioFiles: false,
        speed: 1,
        ffplayAvailable: true,
      }),
    ).toEqual({ mode: "buffered", warnings: [] });
  });

  it("uses buffered mode for custom server URLs", () => {
    expect(
      resolvePlaybackMode({
        isGateway: true,
        hasCustomPath: true,
        saveAudioFiles: false,
        speed: 1,
        ffplayAvailable: true,
      }),
    ).toEqual({ mode: "buffered", warnings: [] });
  });

  it("streams for gateway servers when ffplay is available", () => {
    expect(
      resolvePlaybackMode({
        isGateway: true,
        hasCustomPath: false,
        saveAudioFiles: false,
        speed: 1,
        ffplayAvailable: true,
      }),
    ).toEqual({ mode: "stream", warnings: [] });
  });

  it("falls back to buffered playback when save-audio is enabled", () => {
    const result = resolvePlaybackMode({
      isGateway: true,
      hasCustomPath: false,
      saveAudioFiles: true,
      speed: 1,
      ffplayAvailable: true,
    });

    expect(result.mode).toBe("buffered");
    expect(result.warnings).toContain("Save audio requires buffered mode — streaming disabled");
  });

  it("falls back to buffered playback when speed is not 1.0", () => {
    const result = resolvePlaybackMode({
      isGateway: true,
      hasCustomPath: false,
      saveAudioFiles: false,
      speed: 1.5,
      ffplayAvailable: true,
    });

    expect(result.mode).toBe("buffered");
    expect(result.warnings).toContain("Playback speed requires buffered mode — streaming disabled");
  });

  it("falls back to buffered playback when ffplay is unavailable", () => {
    const result = resolvePlaybackMode({
      isGateway: true,
      hasCustomPath: false,
      saveAudioFiles: false,
      speed: 1,
      ffplayAvailable: false,
    });

    expect(result.mode).toBe("buffered");
    expect(result.warnings).toContain("ffplay not found — streaming disabled");
  });
});

describe("shouldProbeFfplay", () => {
  it("matches the streaming prerequisites before probing ffplay", () => {
    expect(
      shouldProbeFfplay({
        isGateway: true,
        hasCustomPath: false,
        saveAudioFiles: false,
        speed: 1,
      }),
    ).toBe(true);

    expect(
      shouldProbeFfplay({
        isGateway: true,
        hasCustomPath: false,
        saveAudioFiles: true,
        speed: 1,
      }),
    ).toBe(false);
  });
});

describe("parseSpeed", () => {
  it("defaults invalid values to 1", () => {
    expect(parseSpeed(undefined)).toBe(1);
    expect(parseSpeed("not-a-number")).toBe(1);
    expect(parseSpeed("-1")).toBe(1);
  });

  it("clamps speed to the supported range", () => {
    expect(parseSpeed("0.1")).toBe(0.25);
    expect(parseSpeed("5")).toBe(4);
  });
});
