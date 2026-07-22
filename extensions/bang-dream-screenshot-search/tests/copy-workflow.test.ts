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
    const download = vi.fn(async () => "/tmp/example.jpg");
    const copyFile = vi.fn(async () => {
      events.push("copy");
    });
    const removeStaleFiles = vi.fn(async () => {
      events.push("cleanup");
    });
    await expect(
      copyScreenshotFile({ screenshot, download, copyFile, removeStaleFiles }),
    ).resolves.toBeUndefined();
    expect(download).toHaveBeenCalledWith(screenshot.copyUrl);
    expect(copyFile).toHaveBeenCalledWith("/tmp/example.jpg");
    expect(removeStaleFiles).toHaveBeenCalledWith("/tmp/example.jpg");
    expect(events).toEqual(["copy", "cleanup"]);
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
    ).resolves.toBeUndefined();
  });
});
