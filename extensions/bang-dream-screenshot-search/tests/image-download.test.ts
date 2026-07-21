import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CLIPBOARD_FILENAME_PATTERN,
  downloadJpeg,
  isJpeg,
  removeStaleClipboardFiles,
} from "../src/lib/image-download";

const temporaryDirectories: string[] = [];
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);

async function makeTemporaryRoot(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "bang-dream-screenshot-search-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("JPEG download", () => {
  it("recognizes JPEG magic bytes", () => {
    expect(isJpeg(jpegBytes)).toBe(true);
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });

  it("writes a validated image to a content-addressed clipboard filename", async () => {
    const temporaryRoot = await makeTemporaryRoot();
    const path = await downloadJpeg("https://example.com/image.jpg", {
      temporaryRoot,
      fetchImpl: async () => new Response(jpegBytes, { status: 200 }),
    });
    expect(CLIPBOARD_FILENAME_PATTERN.test(path.split("/").at(-1) ?? "")).toBe(true);
    expect(new Uint8Array(await readFile(path))).toEqual(jpegBytes);
  });

  it("uses different paths for different image content and removes stale images", async () => {
    const temporaryRoot = await makeTemporaryRoot();
    const firstPath = await downloadJpeg("https://example.com/first.jpg", {
      temporaryRoot,
      fetchImpl: async () => new Response(jpegBytes, { status: 200 }),
    });
    const secondBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10, 0xff, 0xd9]);
    const secondPath = await downloadJpeg("https://example.com/second.jpg", {
      temporaryRoot,
      fetchImpl: async () => new Response(secondBytes, { status: 200 }),
    });
    expect(secondPath).not.toBe(firstPath);

    await writeFile(join(temporaryRoot, "bang-dream-screenshot-search", "clipboard.jpg"), jpegBytes);
    await removeStaleClipboardFiles(secondPath);

    expect(await readdir(join(temporaryRoot, "bang-dream-screenshot-search"))).toEqual([secondPath.split("/").at(-1)]);
  });

  it("rejects HTTP failures and invalid image data", async () => {
    const temporaryRoot = await makeTemporaryRoot();
    await expect(
      downloadJpeg("https://example.com/missing.jpg", {
        temporaryRoot,
        fetchImpl: async () => new Response(null, { status: 404 }),
      }),
    ).rejects.toThrow("HTTP 404");
    await expect(
      downloadJpeg("https://example.com/not-jpeg.jpg", {
        temporaryRoot,
        fetchImpl: async () => new Response("not an image", { status: 200 }),
      }),
    ).rejects.toThrow("not a valid JPEG");
  });

  it("rejects files over the configured size", async () => {
    const temporaryRoot = await makeTemporaryRoot();
    await expect(
      downloadJpeg("https://example.com/large.jpg", {
        temporaryRoot,
        maxBytes: 4,
        fetchImpl: async () => new Response(jpegBytes, { status: 200 }),
      }),
    ).rejects.toThrow("larger than the allowed download size");
  });
});
