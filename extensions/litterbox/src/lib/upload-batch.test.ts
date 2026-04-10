import { describe, expect, it, vi } from "vitest";
import { UploadBatchError, uploadFilesBatch } from "./upload-batch";

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

  it("copies and stores successful uploads before surfacing a later upload failure", async () => {
    const uploadFile = vi
      .fn(async (filePath: string) => `https://litterbox.catbox.moe/${filePath.split("/").pop()}`)
      .mockResolvedValueOnce("https://litterbox.catbox.moe/one.txt")
      .mockRejectedValueOnce(new Error("Network down"));
    const addRecentUpload = vi.fn(async () => undefined);
    const copyToClipboard = vi.fn(async () => undefined);
    const now = vi.fn(() => 1_700_000_000_000);

    const result = uploadFilesBatch(["/tmp/one.txt", "/tmp/two.png"], "24h", {
      uploadFile,
      addRecentUpload,
      copyToClipboard,
      now,
    });

    await expect(result).rejects.toBeInstanceOf(UploadBatchError);
    await expect(result).rejects.toMatchObject({
      uploads: [{ filename: "one.txt", url: "https://litterbox.catbox.moe/one.txt" }],
      failedFilename: "two.png",
      clipboardCopied: true,
      message: "Network down",
    });
    expect(copyToClipboard).toHaveBeenCalledWith("https://litterbox.catbox.moe/one.txt");
    expect(addRecentUpload).toHaveBeenCalledOnce();
    expect(addRecentUpload).toHaveBeenCalledWith({
      url: "https://litterbox.catbox.moe/one.txt",
      time: "24h",
      uploadedAt: 1_700_000_000_000,
      filename: "one.txt",
    });
  });

  it("does not store uploads if copying URLs to the clipboard fails", async () => {
    const uploadFile = vi.fn(async (filePath: string) => `https://litterbox.catbox.moe/${filePath.split("/").pop()}`);
    const addRecentUpload = vi.fn(async () => undefined);
    const copyToClipboard = vi.fn(async () => {
      throw new Error("Clipboard unavailable");
    });

    const result = uploadFilesBatch(["/tmp/one.txt", "/tmp/two.png"], "24h", {
      uploadFile,
      addRecentUpload,
      copyToClipboard,
    });

    await expect(result).rejects.toBeInstanceOf(UploadBatchError);
    await expect(result).rejects.toMatchObject({
      uploads: [
        { filename: "one.txt", url: "https://litterbox.catbox.moe/one.txt" },
        { filename: "two.png", url: "https://litterbox.catbox.moe/two.png" },
      ],
      clipboardCopied: false,
      message: "Clipboard unavailable",
    });
    expect(copyToClipboard).toHaveBeenCalledWith(
      "https://litterbox.catbox.moe/one.txt\nhttps://litterbox.catbox.moe/two.png",
    );
    expect(addRecentUpload).not.toHaveBeenCalled();
  });
});
