import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadToCache, expandHome, saveToDirectory, uniquePath } from "../src/lib/files";
import { IconFile } from "../src/lib/types";

const file: IconFile = {
  variant: "dark",
  format: "webp",
  url: "https://cdn.example.com/webp/portabase-dark.webp",
  fileName: "portabase-dark.webp",
};

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "dashboard-icons-test-"));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("missing")) return new Response("nope", { status: 404, statusText: "Not Found" });
      return new Response(new Uint8Array([1, 2, 3]));
    }),
  );
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(directory, { recursive: true, force: true });
});

describe("expandHome", () => {
  it("expands a leading tilde only", () => {
    expect(expandHome("~/Downloads")).toBe(join(homedir(), "Downloads"));
    expect(expandHome("/tmp/~x")).toBe("/tmp/~x");
  });
});

describe("uniquePath", () => {
  it("adds a counter instead of overwriting", async () => {
    expect(await uniquePath(directory, "ntfy.webp")).toBe(join(directory, "ntfy.webp"));
    await writeFile(join(directory, "ntfy.webp"), "x");
    await writeFile(join(directory, "ntfy-1.webp"), "x");
    expect(await uniquePath(directory, "ntfy.webp")).toBe(join(directory, "ntfy-2.webp"));
  });
});

describe("saveToDirectory", () => {
  it("downloads into the folder and never overwrites", async () => {
    const first = await saveToDirectory(file, directory);
    const second = await saveToDirectory(file, directory);
    expect(first).toBe(join(directory, "portabase-dark.webp"));
    expect(second).toBe(join(directory, "portabase-dark-1.webp"));
    expect([...(await readFile(first))]).toEqual([1, 2, 3]);
  });

  it("creates missing folders", async () => {
    const path = await saveToDirectory(file, join(directory, "nested", "icons"));
    expect(path).toBe(join(directory, "nested", "icons", "portabase-dark.webp"));
  });

  it("reports HTTP errors", async () => {
    await expect(saveToDirectory({ ...file, url: "https://cdn.example.com/missing.webp" }, directory)).rejects.toThrow(
      "Download failed (404 Not Found)",
    );
  });
});

describe("downloadToCache", () => {
  it("keeps the original file name for the clipboard", async () => {
    const path = await downloadToCache(file, directory);
    expect(path).toBe(join(directory, "clipboard", "webp", "dark", "portabase-dark.webp"));
    expect([...(await readFile(path))]).toEqual([1, 2, 3]);
  });
});
