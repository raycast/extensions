import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, readdir, rm, stat, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ScreenReference } from "../lib/types";

const mocks = vi.hoisted(() => ({
  supportPath: `/tmp/mobbin-raycast-image-test-${process.pid}`,
  homePath: `/tmp/mobbin-raycast-image-home-${process.pid}`,
  copy: vi.fn(),
  paste: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  environment: { supportPath: mocks.supportPath },
  Clipboard: { copy: mocks.copy, paste: mocks.paste },
}));
vi.mock("node:os", () => ({
  default: { homedir: () => mocks.homePath },
}));

import {
  cacheFavoriteImage,
  cacheReferenceImage,
  copyReferenceImageFile,
  downloadReferenceImage,
  getImageCachePath,
  isImageExpired,
  pasteReferenceImageFile,
  pruneImageCache,
  removeFavoriteImage,
  validateFavoriteImagePath,
} from "../lib/image-cache";

const screen: ScreenReference = {
  kind: "screen",
  id: "../../../../dangerous",
  title: "Example",
  appName: "Example / Product",
  platform: "ios",
  source: "api",
  mobbinUrl: "https://mobbin.com/screen",
  image: {
    url: "https://example.com/screen.png?signature=secret",
  },
};

function imageResponse(
  contentType = "image/webp",
  body: BodyInit = new Uint8Array([1, 2, 3]),
  headers?: HeadersInit,
): Response {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": contentType, ...headers },
  });
}

describe("image cache", () => {
  beforeEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    mocks.copy.mockReset();
    mocks.paste.mockReset();
    await Promise.all([
      rm(mocks.supportPath, { recursive: true, force: true }),
      rm(mocks.homePath, { recursive: true, force: true }),
    ]);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await Promise.all([
      rm(mocks.supportPath, { recursive: true, force: true }),
      rm(mocks.homePath, { recursive: true, force: true }),
    ]);
  });

  it("creates deterministic hashed paths without provider IDs", () => {
    const first = getImageCachePath(screen);
    const second = getImageCachePath(screen);
    expect(first).toBe(second);
    expect(first).toContain(`${mocks.supportPath}/images/cache/`);
    expect(first).not.toContain("dangerous");
    expect(first).not.toContain("..");
  });

  it("detects expired and fresh image URLs", () => {
    expect(
      isImageExpired({
        url: "https://example.com",
        expiresAt: "2000-01-01",
      }),
    ).toBe(true);
    expect(
      isImageExpired({
        url: "https://example.com",
        expiresAt: "2999-01-01",
      }),
    ).toBe(false);
  });

  it("reuses cached files and preserves the actual extension", async () => {
    const fetchMock = vi.fn(async () => imageResponse("image/webp"));
    vi.stubGlobal("fetch", fetchMock);
    const first = await cacheReferenceImage(screen);
    const second = await cacheReferenceImage(screen);
    expect(first).toBe(second);
    expect(first).toMatch(/\.webp$/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deduplicates identical in-flight image downloads", async () => {
    let finishFetch: ((response: Response) => void) | undefined;
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finishFetch = resolve;
          markStarted?.();
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const first = cacheReferenceImage(screen);
    const second = cacheReferenceImage(screen);
    await started;
    finishFetch?.(imageResponse());
    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.stringMatching(/\.webp$/),
      expect.stringMatching(/\.webp$/),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("cancels an image request when its only consumer is superseded", async () => {
    const controller = new AbortController();
    let requestSignal: AbortSignal | undefined;
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: URL, init: RequestInit) => {
        requestSignal = init.signal ?? undefined;
        markStarted?.();
        return new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true },
          );
        });
      }),
    );

    const pending = cacheReferenceImage(
      { ...screen, id: "cancelled" },
      controller.signal,
    );
    await started;
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(requestSignal?.aborted).toBe(true);
  });

  it("keeps a shared download alive while another consumer still needs it", async () => {
    const controller = new AbortController();
    let finishFetch: ((response: Response) => void) | undefined;
    let requestSignal: AbortSignal | undefined;
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: URL, init: RequestInit) => {
        requestSignal = init.signal ?? undefined;
        markStarted?.();
        return new Promise<Response>((resolve) => {
          finishFetch = resolve;
        });
      }),
    );

    const cancelled = cacheReferenceImage(screen, controller.signal);
    const retained = cacheReferenceImage(screen);
    await started;
    controller.abort();
    await expect(cancelled).rejects.toMatchObject({ name: "AbortError" });
    expect(requestSignal?.aborted).toBe(false);
    finishFetch?.(imageResponse());
    await expect(retained).resolves.toMatch(/\.webp$/);
  });

  it("rejects insecure, non-image, and oversized downloads", async () => {
    await expect(
      cacheReferenceImage({
        ...screen,
        id: "http",
        image: { url: "http://example.com/image.png" },
      }),
    ).rejects.toMatchObject({ code: "bad-request" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => imageResponse("text/plain")),
    );
    await expect(
      cacheReferenceImage({ ...screen, id: "text" }),
    ).rejects.toMatchObject({ code: "contract-mismatch" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        imageResponse("image/png", new Uint8Array(), {
          "Content-Length": String(25 * 1024 * 1024 + 1),
        }),
      ),
    );
    await expect(
      cacheReferenceImage({ ...screen, id: "large" }),
    ).rejects.toMatchObject({ code: "bad-request" });
  });

  it("times out stalled image requests after 30 seconds", async () => {
    vi.useFakeTimers();
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: URL, init: RequestInit) => {
        markStarted?.();
        return new Promise((_resolve, reject) => {
          const rejectAbort = () =>
            reject(init.signal?.reason ?? new Error("aborted"));
          if (init.signal?.aborted) rejectAbort();
          else
            init.signal?.addEventListener("abort", rejectAbort, {
              once: true,
            });
        });
      }),
    );
    const pending = cacheReferenceImage({
      ...screen,
      id: "timeout",
    }).catch((error: unknown) => error);
    await started;
    await vi.advanceTimersByTimeAsync(30_000);
    await expect(pending).resolves.toMatchObject({ code: "timeout" });
  });

  it("uses internal files for copy/paste and unique Downloads paths", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => imageResponse("image/jpeg")),
    );
    const copied = await copyReferenceImageFile(screen);
    const pasted = await pasteReferenceImageFile(screen);
    expect(copied).toBe(pasted);
    expect(mocks.copy).toHaveBeenCalledWith({ file: copied });
    expect(mocks.paste).toHaveBeenCalledWith({ file: pasted });

    const firstDownload = await downloadReferenceImage(screen);
    const secondDownload = await downloadReferenceImage(screen);
    expect(firstDownload).toContain(`${mocks.homePath}/Downloads/`);
    expect(firstDownload).toMatch(/\.jpg$/);
    expect(secondDownload).not.toBe(firstDownload);
    expect(secondDownload).toMatch(/-2\.jpg$/);
  });

  it("keeps favorite files separate and only removes safe paths", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => imageResponse("image/avif")),
    );
    const favorite = await cacheFavoriteImage(screen);
    expect(favorite).toContain("/images/favorites/");
    await expect(validateFavoriteImagePath(favorite)).resolves.toBe(favorite);
    await expect(
      validateFavoriteImagePath("/tmp/untrusted.png"),
    ).resolves.toBeUndefined();
    await removeFavoriteImage("/tmp/untrusted.png");
    await removeFavoriteImage(favorite);
    await expect(stat(favorite)).rejects.toBeTruthy();
  });

  it("prunes stale temporary files without touching fresh files", async () => {
    const cacheDirectory = path.join(mocks.supportPath, "images", "cache");
    await mkdir(cacheDirectory, { recursive: true });
    const oldFile = path.join(cacheDirectory, "old.png");
    const freshFile = path.join(cacheDirectory, "fresh.png");
    await writeFile(oldFile, "old");
    await writeFile(freshFile, "fresh");
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await utimes(oldFile, oldDate, oldDate);
    await pruneImageCache();
    await expect(stat(oldFile)).rejects.toBeTruthy();
    await expect(stat(freshFile)).resolves.toBeTruthy();
  });

  it("retains at most 200 temporary files", async () => {
    const cacheDirectory = path.join(mocks.supportPath, "images", "cache");
    await mkdir(cacheDirectory, { recursive: true });
    await Promise.all(
      Array.from({ length: 201 }, (_, index) =>
        writeFile(path.join(cacheDirectory, `${index}.png`), "image"),
      ),
    );
    await pruneImageCache();
    await expect(readdir(cacheDirectory)).resolves.toHaveLength(200);
  });
});
