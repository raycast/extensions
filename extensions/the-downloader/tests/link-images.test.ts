import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

vi.mock("../src/lib/safe-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/safe-fetch")>()),
  safeFetch: vi.fn(),
}));

import { safeFetch } from "../src/lib/safe-fetch";
import { MAX_CHAT_IMAGES, fetchImages, imageDecision, imageQuestion } from "../src/lib/link-images";

describe("imageDecision", () => {
  it.each([
    ["ask", true, 3, "ask"],
    ["always", true, 3, "use"],
    ["never", true, 3, "skip"],
    ["ask", false, 3, "skip"],
    ["always", false, 3, "skip"],
    ["always", true, 0, "skip"],
    [undefined, true, 2, "ask"],
    ["something-old", true, 2, "ask"],
  ] as const)("preference %s, engine sees images %s, %d images → %s", (pref, sees, count, expected) => {
    expect(imageDecision(pref, sees, count)).toBe(expected);
  });
});

describe("imageQuestion", () => {
  it("says how many images will be sent", () => {
    expect(imageQuestion(3)).toBe("Let the AI look at this post's 3 images?");
    expect(imageQuestion(1)).toBe("Let the AI look at this post's image?");
    expect(imageQuestion(9)).toBe(`Let the AI look at the first ${MAX_CHAT_IMAGES} of this post's 9 images?`);
  });
});

describe("fetchImages", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "chat-images-"));
    vi.mocked(safeFetch).mockReset();
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("saves up to the limit through safeFetch, images only, skipping ones that fail", async () => {
    vi.mocked(safeFetch).mockImplementation(async (url) => {
      if (url.includes("broken")) throw new Error("HTTP 404 from cdn");
      return { url, status: 200, contentType: "image/png", body: Buffer.from("png") };
    });
    const urls = [
      "https://cdn/a.png",
      "https://cdn/broken.png",
      "https://cdn/b",
      "https://cdn/c",
      "https://cdn/d",
      "https://cdn/e",
    ];
    const saved = await fetchImages(urls, dir);
    expect(saved).toHaveLength(MAX_CHAT_IMAGES);
    expect(saved.every((p) => p.startsWith(dir) && p.endsWith(".png") && fs.existsSync(p))).toBe(true);
    expect(vi.mocked(safeFetch).mock.calls[0][1]).toMatchObject({ accept: ["image/"] });
  });

  it("names files by their type", async () => {
    vi.mocked(safeFetch).mockResolvedValue({
      url: "u",
      status: 200,
      contentType: "image/jpeg; q=1",
      body: Buffer.from("j"),
    });
    expect((await fetchImages(["https://cdn/x?sig=1"], dir))[0]).toMatch(/\.jpg$/);
  });

  it("stops when the answer is stopped", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(fetchImages(["https://cdn/a.png"], dir, { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
