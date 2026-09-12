import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadAudio } from "./downloader";

const testDoubles = vi.hoisted(() => ({
  conversions: [] as Array<{
    inputPath: string;
    outputPath: string;
    resolve: () => void;
  }>,
  tempDir: `${process.cwd()}/.tmp-audio-downloader-${process.pid}`,
  timedFetch: vi.fn(),
  x: vi.fn(),
}));

vi.mock("tinyexec", () => ({
  x: testDoubles.x,
}));

vi.mock("@/consts", () => ({
  EASYDICT_TMP_DIR: testDoubles.tempDir,
}));

vi.mock("@/utils/crypto", () => ({
  md5: () => "audio-hash",
}));

vi.mock("@/utils/errors", () => ({
  normalizeError: (error: unknown) =>
    error instanceof Error ? { name: error.name, message: error.message } : { name: "Error", message: String(error) },
}));

vi.mock("@/utils/http", () => ({
  timedFetch: testDoubles.timedFetch,
}));

vi.mock("@/utils/logger", () => ({
  logError: vi.fn(),
  logTrace: vi.fn(),
}));

const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");

beforeEach(() => {
  fs.rmSync(testDoubles.tempDir, { force: true, recursive: true });
  testDoubles.conversions.splice(0);
  testDoubles.timedFetch.mockReset();
  testDoubles.x.mockReset();
  Object.defineProperty(process, "platform", { value: "darwin" });

  const wavBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]);
  testDoubles.timedFetch.mockResolvedValue(new Blob([wavBytes]));
  testDoubles.x.mockImplementation((_command: string, args: string[]) => {
    let resolveResult!: (result: { exitCode: number }) => void;
    const processPromise = new Promise<{ exitCode: number }>((resolve) => {
      resolveResult = resolve;
    });
    const inputPath = args.at(-2);
    const outputPath = args.at(-1);
    if (!inputPath || !outputPath) {
      throw new Error("Expected afconvert input and output paths");
    }

    testDoubles.conversions.push({
      inputPath,
      outputPath,
      resolve: () => {
        fs.writeFileSync(outputPath, "converted audio");
        resolveResult({ exitCode: 0 });
      },
    });
    return Object.assign(processPromise, { aborted: false });
  });
});

afterEach(() => {
  fs.rmSync(testDoubles.tempDir, { force: true, recursive: true });
  if (originalPlatform) {
    Object.defineProperty(process, "platform", originalPlatform);
  }
});

describe("downloadAudio", () => {
  it("isolates concurrent WAV conversions that share a cache key", async () => {
    const url = "https://example.com/audio.wav";

    const firstDownload = downloadAudio(url);
    const secondDownload = downloadAudio(url);
    await vi.waitFor(() => expect(testDoubles.conversions).toHaveLength(2));

    const [firstConversion, secondConversion] = testDoubles.conversions;
    expect(firstConversion.inputPath).not.toBe(secondConversion.inputPath);
    expect(firstConversion.outputPath).not.toBe(secondConversion.outputPath);

    firstConversion.resolve();
    const firstPath = await firstDownload;
    secondConversion.resolve();
    const secondPath = await secondDownload;

    const expectedPath = path.join(testDoubles.tempDir, "audio", "audio-hash.m4a");
    expect(firstPath).toBe(expectedPath);
    expect(secondPath).toBe(expectedPath);
    expect(fs.readdirSync(path.dirname(expectedPath))).toEqual(["audio-hash.m4a"]);
  });
});
