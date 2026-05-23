import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as path from "node:path";
import { findHomebrewPath, resolveBinary } from "../src/lib/binary";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("node:os", () => ({
  homedir: () => "/Users/test",
}));

import * as fs from "node:fs";

const originalPlatform = process.platform;
const originalPath = process.env.PATH;

function setPlatform(platform: NodeJS.Platform) {
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
}

beforeEach(() => {
  process.env.PATH = "";
});

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
  process.env.PATH = originalPath;
});

describe("resolveBinary on macOS", () => {
  beforeEach(() => setPlatform("darwin"));

  it("returns the preference path when it exists on disk", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    expect(resolveBinary("yt-dlp", "/custom/bin/yt-dlp")).toBe("/custom/bin/yt-dlp");
  });

  it("falls back to /opt/homebrew/bin when nothing is found on disk", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(resolveBinary("yt-dlp", "/missing/yt-dlp")).toBe("/opt/homebrew/bin/yt-dlp");
  });

  it("resolves a fallback default path when no preference is given", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(resolveBinary("gallery-dl")).toBe("/opt/homebrew/bin/gallery-dl");
  });

  it("returns the managed-binary path when it exists on disk (managed install takes precedence over system search)", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/support/spotdl");
    expect(resolveBinary("spotdl", undefined, "/support")).toBe("/support/spotdl");
  });

  it("falls back to a system spotdl (e.g. brew-installed) when the managed binary isn't downloaded yet", () => {
    // Picking up a brew-installed spotdl is what lets users avoid the
    // Rosetta-requiring prebuilt binary on Apple Silicon.
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/opt/homebrew/bin/spotdl");
    expect(resolveBinary("spotdl", undefined, "/support")).toBe("/opt/homebrew/bin/spotdl");
  });

  it("returns the managed path when neither the managed binary nor any system copy exists (lets the Installer surface 'not installed')", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(resolveBinary("spotdl", undefined, "/support")).toBe("/support/spotdl");
  });

  it("lets an existing preference path override the managed directory", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    expect(resolveBinary("spotdl", "/custom/spotdl", "/support")).toBe("/custom/spotdl");
  });

  it("finds the binary in /usr/local/bin on Intel Macs", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/usr/local/bin/yt-dlp");
    expect(resolveBinary("yt-dlp")).toBe("/usr/local/bin/yt-dlp");
  });

  it("prefers Apple-Silicon Homebrew over Intel Homebrew when both have the binary", () => {
    vi.mocked(fs.existsSync).mockImplementation(
      (p) => p === "/opt/homebrew/bin/yt-dlp" || p === "/usr/local/bin/yt-dlp",
    );
    expect(resolveBinary("yt-dlp")).toBe("/opt/homebrew/bin/yt-dlp");
  });

  it("finds a Cargo-installed binary in ~/.cargo/bin (e.g. monolith)", () => {
    const expected = path.join("/Users/test/.cargo/bin/monolith");
    vi.mocked(fs.existsSync).mockImplementation((p) => p === expected);
    expect(resolveBinary("monolith")).toBe(expected);
  });

  it("finds a pipx-installed binary in ~/.local/bin (e.g. gallery-dl)", () => {
    const expected = path.join("/Users/test/.local/bin/gallery-dl");
    vi.mocked(fs.existsSync).mockImplementation((p) => p === expected);
    expect(resolveBinary("gallery-dl")).toBe(expected);
  });

  it("finds a MacPorts-installed binary in /opt/local/bin", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/opt/local/bin/ffmpeg");
    expect(resolveBinary("ffmpeg")).toBe("/opt/local/bin/ffmpeg");
  });

  it("falls back to PATH entries when none of the well-known dirs match", () => {
    process.env.PATH = "/some/custom/bin:/another/bin";
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/another/bin/yt-dlp");
    expect(resolveBinary("yt-dlp")).toBe("/another/bin/yt-dlp");
  });

  it("ignores a preference path that doesn't exist and uses the discovered location", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/usr/local/bin/yt-dlp");
    expect(resolveBinary("yt-dlp", "/missing/yt-dlp")).toBe("/usr/local/bin/yt-dlp");
  });
});

describe("findHomebrewPath", () => {
  beforeEach(() => setPlatform("darwin"));

  it("returns /opt/homebrew/bin/brew on Apple Silicon", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/opt/homebrew/bin/brew");
    expect(findHomebrewPath("/Users/test")).toBe("/opt/homebrew/bin/brew");
  });

  it("returns /usr/local/bin/brew on Intel Macs", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/usr/local/bin/brew");
    expect(findHomebrewPath("/Users/test")).toBe("/usr/local/bin/brew");
  });

  it("prefers Apple-Silicon brew over Intel brew when both exist", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === "/opt/homebrew/bin/brew" || p === "/usr/local/bin/brew");
    expect(findHomebrewPath("/Users/test")).toBe("/opt/homebrew/bin/brew");
  });

  it("falls back to /opt/homebrew/bin/brew when brew is not found anywhere", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(findHomebrewPath("/Users/test")).toBe("/opt/homebrew/bin/brew");
  });
});
