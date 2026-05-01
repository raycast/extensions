import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { readNowPlaying, formatSummary, NowPlaying } from "../nowplaying";

describe("nowplaying reader", () => {
  let tmpDir: string;
  let cachePath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ls-np-"));
    cachePath = path.join(tmpDir, "nowplaying.json");
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("readNowPlaying returns null when file missing", async () => {
    await expect(readNowPlaying(cachePath)).resolves.toBeNull();
  });

  test("readNowPlaying parses valid payload", async () => {
    await fs.writeFile(
      cachePath,
      JSON.stringify({
        timestamp: 1714650000,
        format: "alac",
        rendition: "Hi-Res Lossless",
        sampleRate: 96000,
        bitDepth: 24,
        channels: 2,
        source: "report",
      }),
    );
    const np = await readNowPlaying(cachePath);
    expect(np).toEqual({
      timestamp: 1714650000,
      format: "alac",
      rendition: "Hi-Res Lossless",
      sampleRate: 96000,
      bitDepth: 24,
      channels: 2,
    });
  });

  test("readNowPlaying returns null on corrupt JSON", async () => {
    await fs.writeFile(cachePath, "not valid json {");
    await expect(readNowPlaying(cachePath)).resolves.toBeNull();
  });

  test("formatSummary builds string for ALAC hi-res", () => {
    const np: NowPlaying = {
      timestamp: 0,
      format: "alac",
      rendition: "Hi-Res Lossless",
      sampleRate: 96000,
      bitDepth: 24,
      channels: 2,
    };
    expect(formatSummary(np)).toBe("96 kHz · 24-bit · Hi-Res Lossless (ALAC)");
  });

  test("formatSummary handles AAC (no bit depth)", () => {
    const np: NowPlaying = {
      timestamp: 0,
      format: "aac",
      rendition: "",
      sampleRate: 44100,
      bitDepth: null,
      channels: 2,
    };
    expect(formatSummary(np)).toBe("44.1 kHz (AAC)");
  });

  test("formatSummary handles 88.2 kHz fractional rate", () => {
    const np: NowPlaying = {
      timestamp: 0,
      format: "alac",
      rendition: "Lossless",
      sampleRate: 88200,
      bitDepth: 24,
      channels: 2,
    };
    expect(formatSummary(np)).toBe("88.2 kHz · 24-bit · Lossless (ALAC)");
  });
});
