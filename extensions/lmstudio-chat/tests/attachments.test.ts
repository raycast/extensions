import { execFile } from "node:child_process";
import { copyFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { beforeAll, describe, expect, it } from "vitest";
import {
  MAX_IMAGE_DIMENSION,
  MAX_TEXT_BYTES,
  classifyPath,
  downscaleImage,
  mimeForImage,
} from "../src/lib/attachments";

const execFileAsync = promisify(execFile);

// Downscaling shells out to macOS-only `sips` (the extension itself is
// macOS-only); skip those cases elsewhere so `npm test` still runs.
const onMac = process.platform === "darwin";

// 1x1 transparent PNG
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

let dir: string;
let cacheDir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "lmstudio-attach-"));
  await writeFile(join(dir, "shot.png"), TINY_PNG);
  await writeFile(join(dir, "notes.md"), "# hello\nworld");
  await writeFile(join(dir, "data.bin"), Buffer.from([0x00, 0x01, 0x02]));
  await writeFile(join(dir, "weird.dat"), Buffer.from([0xff, 0xfe, 0x41]));
  await writeFile(join(dir, "big.txt"), "x".repeat(MAX_TEXT_BYTES + 1));

  if (onMac) {
    // 3000x3000 oversized fixture built from the tiny PNG via sips (macOS built-in)
    await execFileAsync("sips", [
      "-z", "3000", "3000",
      join(dir, "shot.png"),
      "--out", join(dir, "big.png"),
    ]);
    // 100x50 small-resolution fixture (sips -z takes height then width)
    await execFileAsync("sips", [
      "-z", "50", "100",
      join(dir, "shot.png"),
      "--out", join(dir, "wide.png"),
    ]);
  }
  cacheDir = join(dir, "cache");
});

describe("classifyPath", () => {
  it("classifies png as image without reading content", async () => {
    const r = await classifyPath(join(dir, "shot.png"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.attachment).toEqual({
        type: "image",
        path: join(dir, "shot.png"),
        name: "shot.png",
      });
    }
  });

  it("classifies md as text and freezes content", async () => {
    const r = await classifyPath(join(dir, "notes.md"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.attachment.type).toBe("text");
      expect(r.attachment.content).toBe("# hello\nworld");
      expect(r.attachment.name).toBe("notes.md");
    }
  });

  it("rejects binary files with unknown extension", async () => {
    const r = await classifyPath(join(dir, "data.bin"));
    expect(r.ok).toBe(false);
  });

  it("rejects invalid UTF-8 files with unknown extension", async () => {
    const r = await classifyPath(join(dir, "weird.dat"));
    expect(r.ok).toBe(false);
  });

  it("rejects oversized text files", async () => {
    const r = await classifyPath(join(dir, "big.txt"));
    expect(r.ok).toBe(false);
  });

  it("rejects missing files", async () => {
    const r = await classifyPath(join(dir, "nope.txt"));
    expect(r.ok).toBe(false);
  });
});

describe("mimeForImage", () => {
  it("maps extensions to mime types", () => {
    expect(mimeForImage("/a/b.png")).toBe("image/png");
    expect(mimeForImage("/a/b.JPG")).toBe("image/jpeg");
    expect(mimeForImage("/a/b.webp")).toBe("image/webp");
  });
});

describe.skipIf(!onMac)("image downscaling", () => {
  it("keeps small images at their original path (no copy)", async () => {
    const r = await classifyPath(join(dir, "shot.png"), { imageCacheDir: cacheDir });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.attachment.path).toBe(join(dir, "shot.png"));
  });

  it("downscales oversized images into the cache dir as jpg", async () => {
    const r = await classifyPath(join(dir, "big.png"), { imageCacheDir: cacheDir });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.attachment.name).toBe("big.png");
    expect(r.attachment.path.startsWith(cacheDir)).toBe(true);
    expect(r.attachment.path.endsWith(".jpg")).toBe(true);
    const { stdout } = await execFileAsync("sips", [
      "-g", "pixelWidth", "-g", "pixelHeight",
      r.attachment.path,
    ]);
    const w = Number(/pixelWidth: (\d+)/.exec(stdout)?.[1]);
    const h = Number(/pixelHeight: (\d+)/.exec(stdout)?.[1]);
    expect(Math.max(w, h)).toBeLessThanOrEqual(MAX_IMAGE_DIMENSION);
  });

  it("reuses the cached copy on repeat classification", async () => {
    const first = await classifyPath(join(dir, "big.png"), { imageCacheDir: cacheDir });
    const second = await classifyPath(join(dir, "big.png"), { imageCacheDir: cacheDir });
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.attachment.path).toBe(first.attachment.path);
    }
  });

  it("rejects oversized images when no cache dir is provided", async () => {
    const r = await classifyPath(join(dir, "big.png"));
    expect(r.ok).toBe(false);
  });

  it("never upscales: target capped at the source long edge", async () => {
    const out = await downscaleImage(
      join(dir, "wide.png"),
      cacheDir,
      Math.min(MAX_IMAGE_DIMENSION, 100),
    );
    const { stdout } = await execFileAsync("sips", [
      "-g", "pixelWidth", "-g", "pixelHeight",
      out,
    ]);
    expect(Number(/pixelWidth: (\d+)/.exec(stdout)?.[1])).toBe(100);
    expect(Number(/pixelHeight: (\d+)/.exec(stdout)?.[1])).toBe(50);
  });

  it("concurrent downscales of the same file produce one valid cached copy", async () => {
    // Cold cache for determinism: earlier tests' cached copy must not
    // short-circuit either call.
    const raceCacheDir = join(dir, "cache-race");
    const [a, b] = await Promise.all([
      downscaleImage(join(dir, "big.png"), raceCacheDir),
      downscaleImage(join(dir, "big.png"), raceCacheDir),
    ]);
    expect(a).toBe(b);
    const { stdout } = await execFileAsync("sips", ["-g", "pixelWidth", a]);
    expect(Number(/pixelWidth: (\d+)/.exec(stdout)?.[1])).toBeGreaterThan(0);
  });
});

describe("clipboard-style images without a usable extension", () => {
  it.skipIf(!onMac)("classifies an extensionless PNG (Raycast clipboard screenshot) as an image", async () => {
    // Raycast materializes clipboard screenshots as extensionless files
    // named like "Image (1832×1522)" — reproduce that exactly.
    const noExt = join(dir, "Image (1832×1522)");
    await copyFile(join(dir, "big.png"), noExt);
    const r = await classifyPath(noExt, { imageCacheDir: cacheDir });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.attachment.type).toBe("image");
      expect(r.attachment.name).toBe("Image (1832×1522)");
      expect(r.attachment.path.startsWith(cacheDir)).toBe(true);
      expect(r.attachment.path.endsWith(".jpg")).toBe(true);
    }
  });

  it.skipIf(!onMac)("classifies a TIFF as an image and converts it to jpeg", async () => {
    await execFileAsync("sips", [
      "-s", "format", "tiff",
      join(dir, "shot.png"),
      "--out", join(dir, "pic.tiff"),
    ]);
    const r = await classifyPath(join(dir, "pic.tiff"), {
      imageCacheDir: cacheDir,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.attachment.type).toBe("image");
      expect(r.attachment.path.endsWith(".jpg")).toBe(true);
    }
  });

  it("still classifies extensionless UTF-8 text as text", async () => {
    const p = join(dir, "notes-no-ext");
    await writeFile(p, "plain notes");
    const r = await classifyPath(p, { imageCacheDir: cacheDir });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.attachment.type).toBe("text");
      expect(r.attachment.content).toBe("plain notes");
    }
  });
});
