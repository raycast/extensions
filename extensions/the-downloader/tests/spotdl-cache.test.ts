import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as path from "node:path";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import * as fs from "node:fs";
import { invalidateSpotipyCacheIfStale } from "../src/lib/spotdl-cache";

const HOME = "/Users/test";
const SUPPORT = "/support";
const CACHE_A = path.join(HOME, ".spotdl", ".spotipy");
const CACHE_B = path.join(HOME, ".config", "spotdl", ".spotipy");
const FINGERPRINT = path.join(SUPPORT, "spotdl-creds.fingerprint");

beforeEach(() => {
  vi.mocked(fs.readFileSync).mockReturnValue("");
  vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
  vi.mocked(fs.unlinkSync).mockImplementation(() => undefined);
  vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
});

afterEach(() => vi.restoreAllMocks());

describe("invalidateSpotipyCacheIfStale", () => {
  it("is a no-op when credentials are missing — there is no fingerprint to compare against", () => {
    invalidateSpotipyCacheIfStale(SUPPORT, undefined, undefined, false, HOME);
    invalidateSpotipyCacheIfStale(SUPPORT, "", "", false, HOME);
    invalidateSpotipyCacheIfStale(SUPPORT, "id", undefined, false, HOME);
    invalidateSpotipyCacheIfStale(SUPPORT, undefined, "secret", false, HOME);
    expect(fs.unlinkSync).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("deletes both cache paths when no previous fingerprint exists (first run)", () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });

    invalidateSpotipyCacheIfStale(SUPPORT, "id-1", "sec-1", false, HOME);

    expect(fs.unlinkSync).toHaveBeenCalledWith(CACHE_A);
    expect(fs.unlinkSync).toHaveBeenCalledWith(CACHE_B);
    expect(fs.writeFileSync).toHaveBeenCalledWith(FINGERPRINT, expect.any(String));
  });

  it("does NOT touch the cache when credentials match the previous fingerprint", () => {
    // First call writes the fingerprint; second call reads it back and matches.
    invalidateSpotipyCacheIfStale(SUPPORT, "id-1", "sec-1", false, HOME);
    const written = vi.mocked(fs.writeFileSync).mock.calls.at(-1)?.[1] as string;
    expect(written).toBeTruthy();

    vi.mocked(fs.unlinkSync).mockClear();
    vi.mocked(fs.writeFileSync).mockClear();
    vi.mocked(fs.readFileSync).mockReturnValue(written);

    invalidateSpotipyCacheIfStale(SUPPORT, "id-1", "sec-1", false, HOME);

    expect(fs.unlinkSync).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("invalidates when the Client ID changes", () => {
    invalidateSpotipyCacheIfStale(SUPPORT, "id-1", "sec-1", false, HOME);
    const written = vi.mocked(fs.writeFileSync).mock.calls.at(-1)?.[1] as string;

    vi.mocked(fs.unlinkSync).mockClear();
    vi.mocked(fs.readFileSync).mockReturnValue(written);

    invalidateSpotipyCacheIfStale(SUPPORT, "id-2", "sec-1", false, HOME);

    expect(fs.unlinkSync).toHaveBeenCalledWith(CACHE_A);
    expect(fs.unlinkSync).toHaveBeenCalledWith(CACHE_B);
  });

  it("invalidates when the Client Secret changes", () => {
    invalidateSpotipyCacheIfStale(SUPPORT, "id-1", "sec-1", false, HOME);
    const written = vi.mocked(fs.writeFileSync).mock.calls.at(-1)?.[1] as string;

    vi.mocked(fs.unlinkSync).mockClear();
    vi.mocked(fs.readFileSync).mockReturnValue(written);

    invalidateSpotipyCacheIfStale(SUPPORT, "id-1", "sec-2", false, HOME);

    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  it("invalidates when user-auth flips — client-credentials and user-auth tokens are different shapes", () => {
    invalidateSpotipyCacheIfStale(SUPPORT, "id-1", "sec-1", false, HOME);
    const written = vi.mocked(fs.writeFileSync).mock.calls.at(-1)?.[1] as string;

    vi.mocked(fs.unlinkSync).mockClear();
    vi.mocked(fs.readFileSync).mockReturnValue(written);

    invalidateSpotipyCacheIfStale(SUPPORT, "id-1", "sec-1", true, HOME);

    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  it("swallows unlink errors so a missing cache file never blocks a download", () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });
    vi.mocked(fs.unlinkSync).mockImplementation(() => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });

    expect(() => invalidateSpotipyCacheIfStale(SUPPORT, "id", "sec", false, HOME)).not.toThrow();
  });

  it("swallows fingerprint-write errors so a read-only supportDir never blocks a download", () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });
    vi.mocked(fs.writeFileSync).mockImplementation(() => {
      throw Object.assign(new Error("EACCES"), { code: "EACCES" });
    });

    expect(() => invalidateSpotipyCacheIfStale(SUPPORT, "id", "sec", false, HOME)).not.toThrow();
  });
});
