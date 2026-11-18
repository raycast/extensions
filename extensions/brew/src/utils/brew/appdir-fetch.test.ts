/**
 * `brewFetchCaskAppdir` against a stubbed `execBrew`. The stub answers
 * `brew config` the way Homebrew 7.0 does, with `HOMEBREW_CASK_OPTS` as a Ruby
 * array of words, or no line when it is unset.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const brew = vi.hoisted(() => ({
  result: undefined as unknown,
  calls: [] as { cmd: string; signal?: AbortSignal }[],
}));

vi.mock("./commands", () => ({
  execBrew: async (cmd: string, options?: { signal?: AbortSignal }) => {
    brew.calls.push({ cmd, signal: options?.signal });
    if (brew.result instanceof Error) throw brew.result;
    return { stdout: brew.result, stderr: "" };
  },
}));

const { brewFetchCaskAppdir } = await import("./fetch");

const config = (...lines: string[]) =>
  ["HOMEBREW_VERSION: 7.0.12", "HOMEBREW_PREFIX: /opt/homebrew", ...lines, "Homebrew Ruby: 4.0.9"].join("\n") + "\n";

describe("brewFetchCaskAppdir", () => {
  beforeEach(() => {
    brew.calls = [];
    vi.stubEnv("HOMEBREW_CASK_OPTS", "--appdir=/FromEnv");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads the last --appdir from brew config", async () => {
    brew.result = config('HOMEBREW_CASK_OPTS: ["--appdir=/Volumes/My Apps", "--no-quarantine", "--appdir=/Last"]');
    const signal = new AbortController().signal;
    expect(await brewFetchCaskAppdir(signal)).toBe("/Last");
    expect(brew.calls).toEqual([{ cmd: "config", signal }]);
  });

  it("reads Ruby's escapes", async () => {
    // Homebrew 7.0.12 prints `--appdir=/Volumes/#{x} \#y` like this.
    brew.result = config('HOMEBREW_CASK_OPTS: ["--appdir=/Volumes/\\#{x} \\\\#y"]');
    expect(await brewFetchCaskAppdir()).toBe("/Volumes/#{x} \\#y");
  });

  it("uses Homebrew's default when brew config has no HOMEBREW_CASK_OPTS", async () => {
    brew.result = config();
    expect(await brewFetchCaskAppdir()).toBe("/Applications");
  });

  it("falls back to the environment when brew fails or the line won't parse", async () => {
    brew.result = new Error("Command failed");
    expect(await brewFetchCaskAppdir()).toBe("/FromEnv");
    brew.result = config('HOMEBREW_CASK_OPTS: ["--appdir=\\e"]');
    expect(await brewFetchCaskAppdir()).toBe("/FromEnv");
  });

  it("rethrows an abort", async () => {
    brew.result = Object.assign(new Error("aborted"), { name: "AbortError" });
    await expect(brewFetchCaskAppdir()).rejects.toThrow("aborted");
  });
});
