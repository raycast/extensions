import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));

import { spawn } from "node:child_process";
import { buildGalleryArgs, isLoginRequiredError, runGalleryDownload } from "../src/lib/gallerydl.js";

function fakeChild() {
  const child = new EventEmitter() as any;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn(() => child.emit("close", null));
  return child;
}

describe("buildGalleryArgs", () => {
  it("sets the base destination with -d", () => {
    expect(buildGalleryArgs({ url: "https://imgur.com/a/x", destination: "/Downloads" })).toEqual([
      "-d",
      "/Downloads",
      "https://imgur.com/a/x",
    ]);
  });

  it("adds --cookies-from-browser when a browser is set", () => {
    expect(buildGalleryArgs({ url: "https://pixiv.net/u/1", destination: "/d", cookiesFromBrowser: "safari" })).toEqual(
      ["-d", "/d", "--cookies-from-browser", "safari", "https://pixiv.net/u/1"],
    );
  });

  it("omits cookies when none is set", () => {
    expect(buildGalleryArgs({ url: "https://imgur.com/a/x", destination: "/d", cookiesFromBrowser: "" })).not.toContain(
      "--cookies-from-browser",
    );
  });
});

describe("runGalleryDownload", () => {
  it("resolves with { files: 2 } and calls onProgress when two file lines are emitted on stdout", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const onProgress = vi.fn();
    const promise = runGalleryDownload(
      "/usr/local/bin/gallery-dl",
      { url: "https://imgur.com/a/x", destination: "/tmp" },
      onProgress,
    );

    child.stdout.emit("data", Buffer.from("file1.jpg\nfile2.jpg\n"));
    child.emit("close", 0);

    await expect(promise).resolves.toEqual({ files: 2 });
    expect(onProgress).toHaveBeenCalled();
  });

  it("rejects with the stderr text when the child exits with a non-zero code", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const promise = runGalleryDownload(
      "/usr/local/bin/gallery-dl",
      { url: "https://imgur.com/a/bad", destination: "/tmp" },
      vi.fn(),
    );

    child.stderr.emit("data", Buffer.from("unsupported URL"));
    child.emit("close", 1);

    await expect(promise).rejects.toThrow("unsupported URL");
  });

  it("closes stdin so gallery-dl cannot block on a password prompt for a logged-in site", () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    runGalleryDownload("/gallery-dl", { url: "https://imgur.com/a/x", destination: "/tmp" }, vi.fn());

    expect(spawn).toHaveBeenCalledWith(
      "/gallery-dl",
      expect.any(Array),
      expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
    );
  });

  it("kills gallery-dl and rejects when no file appears within options.idleMs (e.g. rate-limit backoff)", async () => {
    vi.useFakeTimers();
    try {
      const child = fakeChild();
      (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

      const promise = runGalleryDownload(
        "/gallery-dl",
        { url: "https://imgur.com/a/x", destination: "/tmp", idleMs: 5_000 },
        vi.fn(),
      );
      const assertion = expect(promise).rejects.toThrow(/no output|stuck|killed/i);

      await vi.advanceTimersByTimeAsync(6_000);

      await assertion;
      expect(child.kill).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("isLoginRequiredError", () => {
  it("detects an Instagram-style 'HTTP redirect to login page' error", () => {
    const err = new Error("[instagram][error] HTTP redirect to login page (https://www.instagram.com/accounts/login/)");
    expect(isLoginRequiredError(err)).toBe(true);
  });

  it("detects a 'login required' message", () => {
    expect(isLoginRequiredError(new Error("[twitter][error] Login required to access this resource"))).toBe(true);
  });

  it("detects an 'authentication required' message", () => {
    expect(isLoginRequiredError(new Error("authentication required"))).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isLoginRequiredError(new Error("unsupported URL"))).toBe(false);
    expect(isLoginRequiredError(new Error("network timeout"))).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(isLoginRequiredError("string error")).toBe(false);
    expect(isLoginRequiredError(undefined)).toBe(false);
  });
});
