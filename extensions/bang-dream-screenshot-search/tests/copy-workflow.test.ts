import { describe, expect, it, vi } from "vitest";
import { copyScreenshotFile } from "../src/lib/copy-workflow";
import type { Screenshot } from "../src/types";

const screenshot: Screenshot = {
  id: "mygo/example",
  seriesId: "mygo",
  rawName: "example",
  title: "Example",
  episode: 1,
  previewUrl: "https://example.com/example.webp",
  copyUrl: "https://example.com/example.jpg",
};

describe("copy workflow", () => {
  it("cleans up stale files only after the clipboard succeeds", async () => {
    const events: string[] = [];
    const download = vi.fn(async () => {
      events.push("download");
      return "/tmp/example.jpg";
    });
    const copyFile = vi.fn(async () => {
      events.push("copy");
    });
    const removeStaleFiles = vi.fn(async () => {
      events.push("cleanup");
    });
    await expect(
      copyScreenshotFile({ screenshot, download, copyFile, removeStaleFiles }),
    ).resolves.toBe("copied");
    expect(download).toHaveBeenCalledWith(screenshot.copyUrl);
    expect(copyFile).toHaveBeenCalledWith("/tmp/example.jpg");
    expect(removeStaleFiles).toHaveBeenCalledWith("/tmp/example.jpg");
    expect(events).toEqual(["download", "copy", "cleanup"]);
  });

  it("releases the single-flight guard when downloading fails", async () => {
    await expect(
      copyScreenshotFile({
        screenshot,
        download: async () => {
          throw new Error("download failed");
        },
        copyFile: async () => undefined,
        removeStaleFiles: async () => undefined,
      }),
    ).rejects.toThrow("download failed");

    await expect(
      copyScreenshotFile({
        screenshot,
        download: async () => "/tmp/example.jpg",
        copyFile: async () => undefined,
        removeStaleFiles: async () => undefined,
      }),
    ).resolves.toBe("copied");
  });

  it("does not clean up files when the clipboard fails", async () => {
    const removeStaleFiles = vi.fn(async () => undefined);
    await expect(
      copyScreenshotFile({
        screenshot,
        download: async () => "/tmp/example.jpg",
        copyFile: async () => {
          throw new Error("clipboard failed");
        },
        removeStaleFiles,
      }),
    ).rejects.toThrow("clipboard failed");
    expect(removeStaleFiles).not.toHaveBeenCalled();

    await expect(
      copyScreenshotFile({
        screenshot,
        download: async () => "/tmp/example.jpg",
        copyFile: async () => undefined,
        removeStaleFiles: async () => undefined,
      }),
    ).resolves.toBe("copied");
  });

  it("keeps a successful copy when stale-file cleanup fails", async () => {
    await expect(
      copyScreenshotFile({
        screenshot,
        download: async () => "/tmp/example.jpg",
        copyFile: async () => undefined,
        removeStaleFiles: async () => {
          throw new Error("cleanup failed");
        },
      }),
    ).resolves.toBe("copied");
  });

  it("ignores a second copy while the first workflow is still running", async () => {
    let finishDownload: (() => void) | undefined;
    const firstDownload = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finishDownload = () => resolve("/tmp/first.jpg");
        }),
    );
    const firstCopy = vi.fn(async () => undefined);
    const firstCleanup = vi.fn(async () => undefined);
    const secondDownload = vi.fn(async () => "/tmp/second.jpg");
    const secondCopy = vi.fn(async () => undefined);
    const secondCleanup = vi.fn(async () => undefined);

    const first = copyScreenshotFile({
      screenshot,
      download: firstDownload,
      copyFile: firstCopy,
      removeStaleFiles: firstCleanup,
    });
    const second = copyScreenshotFile({
      screenshot,
      download: secondDownload,
      copyFile: secondCopy,
      removeStaleFiles: secondCleanup,
    });

    await expect(second).resolves.toBe("busy");
    expect(secondDownload).not.toHaveBeenCalled();
    expect(secondCopy).not.toHaveBeenCalled();
    expect(secondCleanup).not.toHaveBeenCalled();

    finishDownload?.();
    await expect(first).resolves.toBe("copied");
    expect(firstCopy).toHaveBeenCalledWith("/tmp/first.jpg");
    expect(firstCleanup).toHaveBeenCalledWith("/tmp/first.jpg");
  });
});
