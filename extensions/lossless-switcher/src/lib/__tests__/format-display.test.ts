import { resolveFormatLine } from "../format-display";
import type { MusicState } from "../applescript";
import type { NowPlaying } from "../nowplaying";

const baseMusic: MusicState = {
  state: "playing",
  name: "Track",
  artist: "Artist",
  album: "Album",
  kind: "Apple Music",
  trackClass: "URL track",
  sampleRate: null,
  bitRate: null,
};

describe("resolveFormatLine", () => {
  test("local file uses AppleScript metadata", () => {
    const state: MusicState = {
      ...baseMusic,
      trackClass: "file track",
      kind: "MPEG-4 audio file",
      sampleRate: 44100,
      bitRate: 256,
    };
    expect(resolveFormatLine(state, null)).toBe(
      "44.1 kHz · 256 kbps · MPEG-4 audio file",
    );
  });

  test("local file without bit rate omits kbps", () => {
    const state: MusicState = {
      ...baseMusic,
      trackClass: "file track",
      kind: "FLAC",
      sampleRate: 96000,
      bitRate: null,
    };
    expect(resolveFormatLine(state, null)).toBe("96 kHz · FLAC");
  });

  test("streaming track uses nowplaying.json", () => {
    const np: NowPlaying = {
      timestamp: 0,
      format: "alac",
      rendition: "Hi-Res Lossless",
      sampleRate: 96000,
      bitDepth: 24,
      channels: 2,
    };
    expect(resolveFormatLine(baseMusic, np)).toBe(
      "96 kHz · 24-bit · Hi-Res Lossless (ALAC)",
    );
  });

  test("streaming with no cache yet shows hint", () => {
    expect(resolveFormatLine(baseMusic, null)).toBe(
      "Format not captured yet — skip to next track",
    );
  });

  test("local file with no rate falls back gracefully", () => {
    const state: MusicState = {
      ...baseMusic,
      trackClass: "file track",
      sampleRate: null,
    };
    expect(resolveFormatLine(state, null)).toBe("Format info unavailable");
  });
});
