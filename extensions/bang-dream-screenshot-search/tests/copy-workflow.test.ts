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
  it("adds to recent only after the clipboard succeeds", async () => {
    const events: string[] = [];
    const download = vi.fn(async () => "/tmp/example.jpg");
    const clearClipboard = vi.fn(async () => {
      events.push("clear");
    });
    const copyFile = vi.fn(async () => {
      events.push("copy");
    });
    const removeStaleFiles = vi.fn(async () => {
      events.push("cleanup");
    });
    await expect(
      copyScreenshotFile({ screenshot, recentIds: ["old"], download, clearClipboard, copyFile, removeStaleFiles }),
    ).resolves.toEqual([screenshot.id, "old"]);
    expect(download).toHaveBeenCalledWith(screenshot.copyUrl);
    expect(clearClipboard).toHaveBeenCalledOnce();
    expect(copyFile).toHaveBeenCalledWith("/tmp/example.jpg");
    expect(removeStaleFiles).toHaveBeenCalledWith("/tmp/example.jpg");
    expect(events).toEqual(["clear", "copy", "cleanup"]);
  });

  it("does not mutate recent IDs when the clipboard fails", async () => {
    const recentIds = ["old"];
    await expect(
      copyScreenshotFile({
        screenshot,
        recentIds,
        download: async () => "/tmp/example.jpg",
        clearClipboard: async () => undefined,
        copyFile: async () => {
          throw new Error("clipboard failed");
        },
        removeStaleFiles: async () => undefined,
      }),
    ).rejects.toThrow("clipboard failed");
    expect(recentIds).toEqual(["old"]);
  });

  it("does not copy or update recent IDs when clearing the clipboard fails", async () => {
    const recentIds = ["old"];
    const copyFile = vi.fn(async () => undefined);
    await expect(
      copyScreenshotFile({
        screenshot,
        recentIds,
        download: async () => "/tmp/example.jpg",
        clearClipboard: async () => {
          throw new Error("clipboard clear failed");
        },
        copyFile,
        removeStaleFiles: async () => undefined,
      }),
    ).rejects.toThrow("clipboard clear failed");
    expect(copyFile).not.toHaveBeenCalled();
    expect(recentIds).toEqual(["old"]);
  });

  it("keeps a successful copy when stale-file cleanup fails", async () => {
    await expect(
      copyScreenshotFile({
        screenshot,
        recentIds: ["old"],
        download: async () => "/tmp/example.jpg",
        clearClipboard: async () => undefined,
        copyFile: async () => undefined,
        removeStaleFiles: async () => {
          throw new Error("cleanup failed");
        },
      }),
    ).resolves.toEqual([screenshot.id, "old"]);
  });
});
