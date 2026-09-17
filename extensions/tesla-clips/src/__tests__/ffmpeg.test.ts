import { beforeEach, describe, expect, it, vi } from "vitest";
import { FfmpegNotFoundError } from "../lib/errors";
import * as execModule from "../lib/exec";
import { isExecutableAvailable, resolveFfmpegExecutable } from "../lib/ffmpeg";

describe("ffmpeg", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when executable responds", async () => {
    vi.spyOn(execModule, "execFileAsync").mockResolvedValue({ stdout: "", stderr: "" });
    await expect(isExecutableAvailable("/opt/homebrew/bin/ffmpeg")).resolves.toBe(true);
  });

  it("returns false when executable is missing", async () => {
    vi.spyOn(execModule, "execFileAsync").mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));
    await expect(isExecutableAvailable("/missing/ffmpeg")).resolves.toBe(false);
  });

  it("resolves the first available candidate", async () => {
    vi.spyOn(execModule, "execFileAsync").mockResolvedValue({ stdout: "", stderr: "" });
    await expect(resolveFfmpegExecutable("/custom/ffmpeg")).resolves.toBe("/custom/ffmpeg");
  });

  it("throws FfmpegNotFoundError when no candidate works", async () => {
    vi.spyOn(execModule, "execFileAsync").mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));
    await expect(resolveFfmpegExecutable("/missing/ffmpeg")).rejects.toBeInstanceOf(FfmpegNotFoundError);
  });
});
