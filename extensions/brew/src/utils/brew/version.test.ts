import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseBrewMajor } from "./version";

// The exec itself is the thing under test here — how many times it runs — so
// it is the one thing stubbed. Everything else in brew-version.ts is real.
const execBrew = vi.hoisted(() => vi.fn());
vi.mock("./commands", () => ({ execBrew }));
const { getBrewMajorVersion, invalidateBrewMajorVersion } = await import("./brew-version");

describe("parseBrewMajor", () => {
  it("reads the major version off real 7.0.1 output", () => {
    expect(parseBrewMajor("Homebrew 7.0.1-11-gd2c0312\n")).toBe(7);
  });

  it("reads the major version with HOMEBREW_NO_INSTALL_FROM_API's extra line", () => {
    expect(parseBrewMajor("Homebrew 7.0.1-11-gd2c0312\nHomebrew/homebrew-core N/A\n")).toBe(7);
  });

  it("reads a 6.x major", () => {
    expect(parseBrewMajor("Homebrew 6.0.21\nHomebrew/homebrew-core (git revision abc; last commit 2026-09-03)\n")).toBe(
      6,
    );
  });

  it("is undefined for the shallow-clone fallback string", () => {
    expect(parseBrewMajor("Homebrew >=4.3.0 (shallow or no git repository)\n")).toBeUndefined();
  });

  it("is undefined for empty or garbage input", () => {
    expect(parseBrewMajor("")).toBeUndefined();
    expect(parseBrewMajor("Error: something")).toBeUndefined();
  });

  it("finds the Homebrew line regardless of line order", () => {
    expect(parseBrewMajor("Homebrew/homebrew-core N/A\nHomebrew 7.0.1")).toBe(7);
  });
});

describe("getBrewMajorVersion", () => {
  beforeEach(() => {
    invalidateBrewMajorVersion();
    execBrew.mockReset();
  });

  it("runs `brew --version` once for callers that arrive together", async () => {
    // Every row of the installed list asks at first paint; without the
    // in-flight dedupe a 146-cask list spawns 146 processes.
    execBrew.mockResolvedValue({ stdout: "Homebrew 7.0.1-11-gd2c0312\n", stderr: "" });
    const answers = await Promise.all(Array.from({ length: 146 }, () => getBrewMajorVersion()));

    expect(execBrew).toHaveBeenCalledTimes(1);
    expect(new Set(answers)).toEqual(new Set([7]));
  });

  it("answers later callers from the cache without running brew again", async () => {
    execBrew.mockResolvedValue({ stdout: "Homebrew 6.0.21\n", stderr: "" });
    expect(await getBrewMajorVersion()).toBe(6);
    expect(await getBrewMajorVersion()).toBe(6);
    expect(execBrew).toHaveBeenCalledTimes(1);
  });

  it("caches an undefined answer instead of re-spawning brew on every mount", async () => {
    // brew missing: every later mount would otherwise re-exec, because only a
    // parsed major was ever cached.
    execBrew.mockRejectedValue(new Error("brew: command not found"));
    expect(await getBrewMajorVersion()).toBeUndefined();
    expect(await getBrewMajorVersion()).toBeUndefined();
    expect(execBrew).toHaveBeenCalledTimes(1);
  });

  it("caches an unparseable answer too", async () => {
    execBrew.mockResolvedValue({ stdout: "Homebrew >=4.3.0 (shallow or no git repository)\n", stderr: "" });
    expect(await getBrewMajorVersion()).toBeUndefined();
    expect(await getBrewMajorVersion()).toBeUndefined();
    expect(execBrew).toHaveBeenCalledTimes(1);
  });

  it("re-reads after invalidation", async () => {
    execBrew.mockRejectedValueOnce(new Error("brew: command not found"));
    expect(await getBrewMajorVersion()).toBeUndefined();

    invalidateBrewMajorVersion();
    execBrew.mockResolvedValue({ stdout: "Homebrew 7.0.1\n", stderr: "" });
    expect(await getBrewMajorVersion()).toBe(7);
    expect(execBrew).toHaveBeenCalledTimes(2);
  });
});
