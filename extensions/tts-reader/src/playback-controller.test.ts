import { EventEmitter } from "events";
import { PassThrough } from "stream";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("fs/promises", () => ({
  mkdir: vi.fn(async () => undefined),
  readFile: vi.fn(async () => {
    throw Object.assign(new Error("missing"), { code: "ENOENT" });
  }),
  rename: vi.fn(async () => undefined),
  writeFile: vi.fn(async () => undefined),
  rm: vi.fn(async () => undefined),
}));

const spawnMock = vi.fn();
vi.mock("child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

describe("startStdinPlayback", () => {
  afterEach(() => {
    spawnMock.mockReset();
    vi.resetModules();
  });

  it("resolves stopped when ffplay is terminated while streaming", async () => {
    const stderr = new PassThrough();
    const stdin = new PassThrough();
    const playbackProcess = Object.assign(new EventEmitter(), {
      pid: 4242,
      stdin,
      stderr,
      kill: vi.fn(),
    });

    spawnMock.mockReturnValue(playbackProcess);

    const { startStdinPlayback } = await import("../src/playback-controller");
    const abortController = new AbortController();

    const playbackPromise = startStdinPlayback(async (stream, signal) => {
      stream.write(Buffer.from("audio"));
      while (!signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }, abortController);

    await vi.waitFor(() => {
      expect(spawnMock).toHaveBeenCalledWith(
        "ffplay",
        ["-nodisp", "-autoexit", "-loglevel", "error", "-i", "-"],
        expect.objectContaining({ stdio: ["pipe", "ignore", "pipe"] }),
      );
    });

    abortController.abort();
    playbackProcess.emit("close", null, "SIGTERM");

    await expect(playbackPromise).resolves.toBe("stopped");
  });

  it("passes custom ffplay args for PCM stdin playback", async () => {
    const stderr = new PassThrough();
    const stdin = new PassThrough();
    const playbackProcess = Object.assign(new EventEmitter(), {
      pid: 4244,
      stdin,
      stderr,
      kill: vi.fn(),
    });

    spawnMock.mockReturnValue(playbackProcess);

    const { startStdinPlayback } = await import("../src/playback-controller");
    const pcmArgs = [
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
    ];
    const abortController = new AbortController();

    const playbackPromise = startStdinPlayback(
      async (stream) => {
        stream.write(Buffer.from("pcm"));
        stream.end();
      },
      abortController,
      pcmArgs,
    );

    await vi.waitFor(() => {
      expect(spawnMock).toHaveBeenCalledWith(
        "ffplay",
        pcmArgs,
        expect.objectContaining({ stdio: ["pipe", "ignore", "pipe"] }),
      );
    });

    playbackProcess.emit("close", 0, null);
    await expect(playbackPromise).resolves.toBe("finished");
  });

  it("terminates ffplay when the stream pump fails", async () => {
    const stderr = new PassThrough();
    const stdin = new PassThrough();
    const playbackProcess = Object.assign(new EventEmitter(), {
      pid: 4243,
      stdin,
      stderr,
      kill: vi.fn(),
    });

    spawnMock.mockReturnValue(playbackProcess);

    const { startStdinPlayback } = await import("../src/playback-controller");
    const failure = new Error("stream failed");
    const playbackPromise = startStdinPlayback(async () => {
      throw failure;
    });

    await expect(playbackPromise).rejects.toThrow("stream failed");
    expect(playbackProcess.kill).toHaveBeenCalledWith("SIGTERM");
  });
});
