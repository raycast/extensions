import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
  rmSync: vi.fn(),
  chmodSync: vi.fn(),
}));

// codesign (macOS) is the only execa call downloadSpotdl makes; stub it.
vi.mock("execa", () => ({ execa: vi.fn(async () => ({ stdout: "" })) }));

import * as fs from "node:fs";
import * as crypto from "node:crypto";
import {
  downloadSpotdl,
  isAppleSilicon,
  isRosettaInstalled,
  resolveSpotdlAsset,
  RosettaRequiredError,
} from "../src/lib/managed-binary";

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
  // clearAllMocks resets call history on the module-level node:fs / execa mocks
  // between tests; restoreAllMocks alone no longer does that under Vitest 4 (it
  // only restores vi.spyOn spies), so without this a writeFileSync call from one
  // test would leak into another's "not.toHaveBeenCalled" assertion.
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
  Object.defineProperty(process, "arch", { value: originalArch, configurable: true });
});

describe("downloadSpotdl Rosetta fail-fast", () => {
  it("throws RosettaRequiredError without downloading on Apple Silicon lacking Rosetta", async () => {
    setArch("darwin", "arm64");
    // isRosettaInstalled checks fs.existsSync(ROSETTA_RUNTIME_PATH) → absent.
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(downloadSpotdl("/tmp/the-downloader-test")).rejects.toBeInstanceOf(RosettaRequiredError);
    // No bytes downloaded — the broken binary is never written to disk.
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("downloadSpotdl integrity verification", () => {
  const bytes = Buffer.from("fake-spotdl-binary-bytes");
  const goodDigest = "sha256:" + crypto.createHash("sha256").update(bytes).digest("hex");
  const DOWNLOAD_URL = "https://github.com/spotDL/spotify-downloader/releases/download/v4.5.0/spotdl-4.5.0-darwin";

  function stubFetch(opts: { digest?: string; downloadUrl?: string }) {
    const downloadUrl = opts.downloadUrl ?? DOWNLOAD_URL;
    const fetchSpy = vi.fn(async (url: string) => {
      if (url.includes("api.github.com")) {
        return {
          ok: true,
          json: async () => ({
            tag_name: "v4.5.0",
            assets: [{ name: "spotdl-4.5.0-darwin", browser_download_url: downloadUrl, digest: opts.digest }],
          }),
        };
      }
      return { ok: true, arrayBuffer: async () => new Uint8Array(bytes).buffer };
    });
    vi.stubGlobal("fetch", fetchSpy);
    return fetchSpy;
  }

  beforeEach(() => {
    // Pin the platform to macOS so the darwin asset resolves regardless of the
    // host OS the suite runs on (on Linux there is no prebuilt binary, so
    // resolveSpotdlAsset would throw before reaching the integrity logic these
    // tests target). afterEach restores process.platform/arch.
    setArch("darwin", "x64");
    // Make Rosetta present so the Apple-Silicon fail-fast guard passes and we
    // reach the integrity logic.
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  it("writes the binary when the SHA-256 digest matches", async () => {
    stubFetch({ digest: goodDigest });
    const p = await downloadSpotdl("/tmp/support");
    expect(p).toContain("spotdl");
    expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
    expect(vi.mocked(fs.renameSync)).toHaveBeenCalled();
  });

  it("throws and writes nothing when the digest does not match", async () => {
    stubFetch({ digest: "sha256:" + "0".repeat(64) });
    await expect(downloadSpotdl("/tmp/support")).rejects.toThrow(/integrity check/i);
    expect(vi.mocked(fs.writeFileSync)).not.toHaveBeenCalled();
  });

  it("proceeds without verification when no digest is published", async () => {
    stubFetch({ digest: undefined });
    const p = await downloadSpotdl("/tmp/support");
    expect(p).toContain("spotdl");
    expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
  });

  it("refuses a download URL on an unexpected host (before fetching the asset)", async () => {
    const fetchSpy = stubFetch({ digest: goodDigest, downloadUrl: "https://evil.example.com/spotdl-4.5.0-darwin" });
    await expect(downloadSpotdl("/tmp/support")).rejects.toThrow(/unexpected host/i);
    // Only the releases-API fetch ran; the asset download did not.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
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
