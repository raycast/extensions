import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { cacheArtwork, setArtworkCacheDir } from "../../src/core/artworkCache";

const PNG_B64 = Buffer.from("fakepngdata").toString("base64");

beforeEach(() => setArtworkCacheDir(mkdtempSync(join(tmpdir(), "art-"))));

describe("cacheArtwork", () => {
  it("writes decoded bytes and returns path", async () => {
    const p = await cacheArtwork("track-1", PNG_B64, "image/png");
    expect(p).toMatch(/\.png$/);
    expect(readFileSync(p!, "utf8")).toBe("fakepngdata");
  });
  it("defaults to jpg extension", async () => {
    const p = await cacheArtwork("track-2", PNG_B64);
    expect(p).toMatch(/\.jpg$/);
  });
  it("is idempotent within TTL (no rewrite)", async () => {
    const p1 = await cacheArtwork("track-3", PNG_B64, "image/png");
    const mtime1 = statSync(p1!).mtimeMs;
    const p2 = await cacheArtwork("track-3", PNG_B64, "image/png");
    expect(p2).toBe(p1);
    expect(statSync(p2!).mtimeMs).toBe(mtime1);
  });
  it("returns null on invalid base64 handling errors", async () => {
    setArtworkCacheDir("/dev/null/not-a-dir");
    expect(await cacheArtwork("x", PNG_B64)).toBeNull();
  });
});
