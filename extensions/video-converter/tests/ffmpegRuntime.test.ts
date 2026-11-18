import { describe, expect, test } from "bun:test";
import { findFFmpegTools, hardwareCandidates, selectVideoEncoder, encoderOptions } from "../src/utils/ffmpegRuntime";

describe("FFmpeg discovery", () => {
  test("Windows PATH, spaces, quoted entries and sibling ffprobe", () => {
    const files = new Set([
      "C:\\Program Files\\FFmpeg\\bin\\ffmpeg.exe",
      "C:\\Program Files\\FFmpeg\\bin\\ffprobe.exe",
    ]);
    expect(
      findFFmpegTools("win32", { Path: '"C:\\Program Files\\FFmpeg\\bin";C:\\Windows' }, (p) => files.has(p)),
    ).toEqual({
      ffmpeg: "C:\\Program Files\\FFmpeg\\bin\\ffmpeg.exe",
      ffprobe: "C:\\Program Files\\FFmpeg\\bin\\ffprobe.exe",
    });
  });
  test("requires ffprobe, not only ffmpeg", () => {
    expect(findFFmpegTools("win32", { PATH: "C:\\ffmpeg\\bin" }, (p) => p.endsWith("\\ffmpeg.exe"))).toBeUndefined();
  });
  test("explicit overrides and sibling discovery", () => {
    const files = new Set(["D:\\Tools\\ffmpeg.exe", "D:\\Tools\\ffprobe.exe"]);
    expect(findFFmpegTools("win32", { FFMPEG_PATH: "D:\\Tools\\ffmpeg.exe" }, (p) => files.has(p))?.ffprobe).toBe(
      "D:\\Tools\\ffprobe.exe",
    );
  });
  test("Homebrew remains supported", () => {
    expect(findFFmpegTools("darwin", {}, (p) => p.startsWith("/opt/homebrew/bin/"))?.ffmpeg).toBe(
      "/opt/homebrew/bin/ffmpeg",
    );
  });
  test("WinGet links outside PATH", () => {
    expect(
      findFFmpegTools("win32", { LOCALAPPDATA: "C:\\Users\\Test\\AppData\\Local" }, (p) =>
        p.includes("\\WinGet\\Links\\"),
      )?.ffmpeg,
    ).toContain("WinGet\\Links\\ffmpeg.exe");
  });
});

describe("encoding libraries", () => {
  test("software H264 explicitly uses libx264", async () => {
    expect(await selectVideoEncoder("h264", false, new Set(["libx264", "h264_nvenc"]), async () => true, "win32")).toBe(
      "libx264",
    );
  });
  test("Windows never selects VideoToolbox", () => {
    expect(hardwareCandidates("h265", "win32")).toEqual(["hevc_nvenc", "hevc_qsv", "hevc_amf"]);
    expect(hardwareCandidates("h264", "darwin")).toEqual(["h264_videotoolbox"]);
  });
  test("compiled encoder with unusable driver is skipped", async () => {
    const tried: string[] = [];
    expect(
      await selectVideoEncoder(
        "h264",
        true,
        new Set(["h264_nvenc", "h264_amf", "libx264"]),
        async (encoder) => {
          tried.push(encoder);
          return encoder === "h264_amf";
        },
        "win32",
      ),
    ).toBe("h264_amf");
    expect(tried).toEqual(["h264_nvenc", "h264_amf"]);
  });
  test("falls back to software when GPUs cannot initialize", async () => {
    expect(await selectVideoEncoder("h265", true, new Set(["hevc_nvenc", "libx265"]), async () => false, "win32")).toBe(
      "libx265",
    );
  });
  test("missing required library produces actionable error", async () => {
    expect(selectVideoEncoder("vp9", false, new Set(), async () => true, "win32")).rejects.toThrow("libvpx-vp9");
  });
  test("x264 presets are not passed to incompatible encoders", () => {
    for (const encoder of ["h264_nvenc", "h264_amf", "hevc_qsv", "h264_videotoolbox", "libvpx-vp9", "mpeg4"]) {
      expect(encoderOptions(encoder, "veryslow")).toEqual([]);
    }
    expect(encoderOptions("libx265", "veryslow")).toEqual(["-preset veryslow"]);
  });
});
