import { describe, expect, test, beforeAll, afterAll, spyOn } from "bun:test";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import {
  inspectMedia,
  selectDuration,
  parseFrameRate,
  estimateVideoBytes,
  gifFps,
  validateGifSettings,
  type MediaInfo,
} from "../src/utils/mediaInfo";
import { encodeGif, estimateGifBytes } from "../src/utils/gifski";
import { findExecutable, findFFmpegTools } from "../src/utils/ffmpegRuntime";
import { convertVideo, cancelConversion, type ConversionTask } from "../src/utils/ffmpeg";
import type { FormValues } from "../src/types";

const values: FormValues = {
  videoFormat: "mp4",
  videoCodec: "h264",
  compressionMode: "bitrate",
  preset: "medium",
  bitrate: "1000",
  maxSize: "5",
  audioBitrate: "128",
  removeAudio: false,
  gifQuality: "50",
  gifFps: "",
  outputFolder: [],
  rename: "",
  subfolderName: "",
  useHardwareAcceleration: false,
  deleteOriginalFiles: false,
  videoFiles: [],
  audioFiles: [],
};
const info: MediaInfo = { duration: 10, fps: 30, width: 1920, hasAudio: true };

test("frame rate parsing and automatic FPS", () => {
  expect(parseFrameRate("30000/1001")).toBeCloseTo(29.97, 2);
  expect(parseFrameRate("0/0")).toBe(0);
  expect(parseFrameRate("bad")).toBe(0);
  expect(gifFps("", info)).toBe(30);
  expect(gifFps("12", info)).toBe(12);
  expect(() => gifFps("", { ...info, fps: 0 })).toThrow();
});
test("invalid stream durations fall back to the container duration", () => {
  for (const value of ["N/A", "0", 0, -1, undefined, Infinity]) expect(selectDuration(value, "12.5")).toBe(12.5);
  expect(selectDuration("2.5", "12.5")).toBe(2.5);
  expect(() => selectDuration("N/A", "N/A")).toThrow();
});
test("GIF quality and FPS validation", () => {
  for (const quality of ["0", "101", "NaN", "50.5", ""]) expect(() => validateGifSettings(quality, "")).toThrow();
  for (const fps of ["0", "-2", "101", "NaN"]) expect(() => validateGifSettings("50", fps)).toThrow();
  expect(() => validateGifSettings("50", "29.97")).not.toThrow();
});
test("video estimates account for audio removal and replacement", () => {
  expect(estimateVideoBytes(values, info)).toBe(1_410_000);
  expect(estimateVideoBytes({ ...values, removeAudio: true }, info)).toBe(1_250_000);
  expect(estimateVideoBytes(values, { ...info, hasAudio: false })).toBe(1_250_000);
  expect(estimateVideoBytes({ ...values, audioFiles: ["audio.wav"] }, { ...info, hasAudio: false })).toBe(1_410_000);
  expect(estimateVideoBytes({ ...values, compressionMode: "filesize" }, info)).toBe(5_000_000);
});
test("Windows gifski executable discovery", () => {
  expect(
    findExecutable("gifski", "win32", { GIFSKI_PATH: "D:\\Apps\\gifski.exe" }, (p) => p === "D:\\Apps\\gifski.exe"),
  ).toBe("D:\\Apps\\gifski.exe");
});

const tools = findFFmpegTools();
const hasTools = !!tools && !!findExecutable("gifski");
describe.skipIf(!hasTools)("FFmpeg and gifski integration", () => {
  let directory: string;
  let input: string;
  let metadata: MediaInfo;
  const streams = (file: string) =>
    JSON.parse(
      execFileSync(tools!.ffprobe, ["-v", "error", "-show_streams", "-of", "json", file], { encoding: "utf8" }),
    ).streams as { codec_name: string; codec_type: string; width: number }[];
  beforeAll(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "gifski test "));
    input = path.join(directory, "source video.mp4");
    execFileSync(tools!.ffmpeg, [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=96x64:rate=30000/1001",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440",
      "-t",
      "0.4",
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      input,
    ]);
    metadata = await inspectMedia(input);
  });
  afterAll(() => fs.rmSync(directory, { recursive: true, force: true }));
  test("GIF conversion ignores hidden audio/bitrate and preserves source FPS", async () => {
    const output = path.join(directory, "result.gif");
    await convertVideo(
      {
        ...values,
        videoFiles: [input],
        outputFolder: [directory],
        videoFormat: "gif",
        rename: "result",
        bitrate: "invalid",
        audioBitrate: "invalid",
        audioFiles: ["missing.wav"],
      },
      () => {},
    );
    expect(streams(output)).toHaveLength(1);
    expect(streams(output)[0].codec_name).toBe("gif");
    expect(streams(output)[0].width).toBe(96);
    const gifInfo = await inspectMedia(output);
    expect(gifInfo.duration).toBeCloseTo(metadata.duration, 1);
  });
  test("cancellation during setup publishes cancelled status", async () => {
    for (const atEncoderSetup of [false, true]) {
      let cancelled = false;
      let snapshot: ConversionTask[] = [];
      await convertVideo(
        { ...values, videoFiles: [input], outputFolder: [directory], rename: "cancel-setup" },
        (tasks) => {
          snapshot = tasks.map((task) => ({ ...task }));
          if (!cancelled && tasks[0].status === "converting" && (!atEncoderSetup || tasks[0].ffmpeg)) {
            cancelled = true;
            cancelConversion();
          }
        },
      );
      expect(cancelled).toBe(true);
      expect(snapshot[0].status).toBe("cancelled");
      expect(fs.existsSync(path.join(directory, "cancel-setup.mp4"))).toBe(false);
    }
  });
  test("failed original deletion preserves successful outputs and continues the batch", async () => {
    const unlink = spyOn(fs.promises, "unlink").mockRejectedValue(new Error("Permission denied"));
    try {
      for (const format of ["gif", "mp4"] as const) {
        let snapshot: ConversionTask[] = [];
        await convertVideo(
          {
            ...values,
            videoFormat: format,
            videoFiles: [input, input],
            outputFolder: [directory],
            rename: `delete-failure-${format}`,
            deleteOriginalFiles: true,
          },
          (tasks) => {
            snapshot = tasks.map((task) => ({ ...task }));
          },
        );
        expect(snapshot.map((task) => task.status)).toEqual(["done", "done"]);
        for (const task of snapshot) {
          expect(task.warning).toContain("Permission denied");
          expect(fs.existsSync(task.outputFile!)).toBe(true);
        }
      }
      expect(fs.existsSync(input)).toBe(true);
    } finally {
      unlink.mockRestore();
    }
  });
  test("sample estimate uses the same encoder settings as output", async () => {
    const estimated = await estimateGifBytes(input, metadata, "50", "12", new AbortController().signal);
    const output = path.join(directory, "12fps.gif");
    await encodeGif({ input, output, info: metadata, quality: "50", fps: "12" });
    expect(estimated).toBeCloseTo(fs.statSync(output).size * 1.1, 0);
  });
  test("longer GIFs estimate size from multiple samples", async () => {
    const longInput = path.join(directory, "long.mp4");
    execFileSync(tools!.ffmpeg, [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=96x64:rate=24",
      "-t",
      "3",
      "-c:v",
      "libx264",
      longInput,
    ]);
    const longInfo = await inspectMedia(longInput);
    const estimated = await estimateGifBytes(longInput, longInfo, "50", "", new AbortController().signal);
    expect(Number.isFinite(estimated)).toBe(true);
    expect(estimated).toBeGreaterThan(0);
  });
  test("cancelling encoding removes partial output", async () => {
    const controller = new AbortController();
    const output = path.join(directory, "cancelled.gif");
    const promise = encodeGif({ input, output, info: metadata, quality: "50", fps: "30", signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toThrow();
    expect(fs.existsSync(output)).toBe(false);
  });
  test("video still keeps audio normally and removes it when requested", async () => {
    await convertVideo({ ...values, videoFiles: [input], outputFolder: [directory], rename: "with-audio" }, () => {});
    expect(streams(path.join(directory, "with-audio.mp4")).some((s) => s.codec_type === "audio")).toBe(true);
    await convertVideo(
      {
        ...values,
        videoFiles: [input],
        outputFolder: [directory],
        rename: "silent",
        removeAudio: true,
        compressionMode: "filesize",
        maxSize: "0.02",
        audioBitrate: "invalid",
        audioFiles: ["missing.wav"],
      },
      () => {},
    );
    expect(streams(path.join(directory, "silent.mp4")).some((s) => s.codec_type === "audio")).toBe(false);
  });
});
