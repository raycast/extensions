import { describe, expect, it, vi } from "vitest";
import { uploadFilesBatch } from "./upload-batch";

describe("uploadFilesBatch", () => {
  it("copies all uploaded URLs to the clipboard in one write", async () => {
    const uploadFile = vi.fn(async (filePath: string) => `https://litterbox.catbox.moe/${filePath.split("/").pop()}`);
    const addRecentUpload = vi.fn(async () => undefined);
    const copyToClipboard = vi.fn(async () => undefined);
    const now = vi.fn(() => 1_700_000_000_000);

    const result = await uploadFilesBatch(["/tmp/one.txt", "/tmp/two.png"], "24h", {
      uploadFile,
      addRecentUpload,
      copyToClipboard,
      now,
    });

    expect(uploadFile).toHaveBeenNthCalledWith(1, "/tmp/one.txt", "24h");
    expect(uploadFile).toHaveBeenNthCalledWith(2, "/tmp/two.png", "24h");
    expect(addRecentUpload).toHaveBeenNthCalledWith(1, {
      url: "https://litterbox.catbox.moe/one.txt",
      time: "24h",
      uploadedAt: 1_700_000_000_000,
      filename: "one.txt",
    });
    expect(addRecentUpload).toHaveBeenNthCalledWith(2, {
      url: "https://litterbox.catbox.moe/two.png",
      time: "24h",
      uploadedAt: 1_700_000_000_000,
      filename: "two.png",
    });
    expect(copyToClipboard).toHaveBeenCalledTimes(1);
    expect(copyToClipboard).toHaveBeenCalledWith(
      "https://litterbox.catbox.moe/one.txt\nhttps://litterbox.catbox.moe/two.png",
    );
    expect(result).toEqual({
      uploads: [
        { filename: "one.txt", url: "https://litterbox.catbox.moe/one.txt" },
        { filename: "two.png", url: "https://litterbox.catbox.moe/two.png" },
      ],
    });
  });
});
