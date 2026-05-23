import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

import * as fs from "node:fs";
import { isAppleSilicon, isRosettaInstalled, resolveSpotdlAsset } from "../src/lib/managed-binary";

const assets = [
  { name: "spotDL", url: "u0" },
  { name: "spotdl-4.5.0-darwin", url: "u1" },
  { name: "spotdl-4.5.0-linux", url: "u2" },
  { name: "spotdl-4.5.0-win32.exe", url: "u3" },
];

describe("resolveSpotdlAsset", () => {
  it("picks the darwin binary on macOS", () => {
    expect(resolveSpotdlAsset("darwin", assets).name).toBe("spotdl-4.5.0-darwin");
  });

  it("picks the win32 binary on Windows", () => {
    expect(resolveSpotdlAsset("win32", assets).name).toBe("spotdl-4.5.0-win32.exe");
  });

  it("never picks the bare 'spotDL' source asset", () => {
    expect(resolveSpotdlAsset("darwin", assets).name).not.toBe("spotDL");
  });

  it("throws when no asset matches the platform", () => {
    expect(() => resolveSpotdlAsset("win32", [{ name: "spotdl-4.5.0-darwin", url: "u1" }])).toThrow();
  });
});

const originalPlatform = process.platform;
const originalArch = process.arch;

function setArch(platform: NodeJS.Platform, arch: NodeJS.Architecture) {
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
  Object.defineProperty(process, "arch", { value: arch, configurable: true });
}

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
  Object.defineProperty(process, "arch", { value: originalArch, configurable: true });
});

describe("isAppleSilicon", () => {
  it("is true on arm64 macOS", () => {
    setArch("darwin", "arm64");
    expect(isAppleSilicon()).toBe(true);
  });

  it("is false on Intel macOS", () => {
    setArch("darwin", "x64");
    expect(isAppleSilicon()).toBe(false);
  });

  it("is false on Windows", () => {
    setArch("win32", "x64");
    expect(isAppleSilicon()).toBe(false);
  });

  it("is false on Linux arm64 (not Apple Silicon)", () => {
    setArch("linux", "arm64");
    expect(isAppleSilicon()).toBe(false);
  });
});

describe("isRosettaInstalled", () => {
  it("returns true on non-Apple-Silicon platforms regardless of disk state", () => {
    // Rosetta is irrelevant off Apple Silicon — never gate work on it.
    setArch("darwin", "x64");
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(isRosettaInstalled()).toBe(true);

    setArch("win32", "x64");
    expect(isRosettaInstalled()).toBe(true);
  });

  it("checks /Library/Apple/usr/share/rosetta/rosetta on Apple Silicon", () => {
    setArch("darwin", "arm64");
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/Library/Apple/usr/share/rosetta/rosetta");
    expect(isRosettaInstalled()).toBe(true);
  });

  it("returns false on Apple Silicon when the Rosetta runtime is missing", () => {
    setArch("darwin", "arm64");
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(isRosettaInstalled()).toBe(false);
  });
});
