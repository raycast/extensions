import { beforeEach, describe, expect, it, vi } from "vitest";
const { stat, access } = vi.hoisted(() => ({ stat: vi.fn(), access: vi.fn() }));
vi.mock("fs/promises", () => ({ stat, access }));
import { UploadBatchError, uploadFilesBatch } from "./upload-batch";

describe("uploadFilesBatch", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    stat.mockResolvedValue({ isFile: () => true, size: 5 });
    access.mockResolvedValue(undefined);
  });
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

  it("preserves successful uploads when copying URLs to the clipboard fails", async () => {
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
    expect(addRecentUpload).toHaveBeenCalledTimes(2);
  });

  it("starts no uploads when a later selected file fails preflight", async () => {
    stat
      .mockResolvedValueOnce({ isFile: () => true, size: 5 })
      .mockResolvedValueOnce({ isFile: () => true, size: 1_000_000_001 });
    const uploadFile = vi.fn();
    const addRecentUpload = vi.fn();
    const copyToClipboard = vi.fn();
    await expect(
      uploadFilesBatch(["/synthetic/one.txt", "/synthetic/large.bin"], "24h", {
        uploadFile,
        addRecentUpload,
        copyToClipboard,
      }),
    ).rejects.toThrow("large.bin exceeds");
    expect(uploadFile).not.toHaveBeenCalled();
    expect(addRecentUpload).not.toHaveBeenCalled();
    expect(copyToClipboard).not.toHaveBeenCalled();
  });

  it("stops after a network failure without uploading the remaining files", async () => {
    const uploadFile = vi
      .fn()
      .mockResolvedValueOnce("https://litter.catbox.moe/one.txt")
      .mockRejectedValueOnce(new Error("Network down"));
    const addRecentUpload = vi.fn();
    const copyToClipboard = vi.fn();
    await expect(
      uploadFilesBatch(["/synthetic/one.txt", "/synthetic/two.txt", "/synthetic/three.txt"], "24h", {
        uploadFile,
        addRecentUpload,
        copyToClipboard,
      }),
    ).rejects.toMatchObject({ totalFiles: 3, failedFilename: "two.txt", clipboardCopied: true });
    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(addRecentUpload).toHaveBeenCalledOnce();
  });

  it("still copies successful links if local history fails", async () => {
    const uploadFile = vi.fn().mockResolvedValue("https://litter.catbox.moe/one.txt");
    const addRecentUpload = vi.fn().mockRejectedValue(new Error("Storage unavailable"));
    const copyToClipboard = vi.fn();
    await expect(
      uploadFilesBatch(["/synthetic/one.txt"], "24h", {
        uploadFile,
        addRecentUpload,
        copyToClipboard,
      }),
    ).rejects.toMatchObject({ clipboardCopied: true, historyErrorMessage: "Storage unavailable" });
    expect(copyToClipboard).toHaveBeenCalledWith("https://litter.catbox.moe/one.txt");
  });
  it.each(["upload", "history", "clipboard"] as const)(
    "treats an empty %s error message as a failure",
    async (stage) => {
      const uploadFile = vi.fn().mockResolvedValue("https://litter.catbox.moe/one.txt");
      const addRecentUpload = vi.fn().mockResolvedValue(undefined);
      const copyToClipboard = vi.fn().mockResolvedValue(undefined);
      const failingAction = { upload: uploadFile, history: addRecentUpload, clipboard: copyToClipboard }[stage];
      failingAction.mockRejectedValue(new Error(""));

      const result = uploadFilesBatch(["/synthetic/one.txt"], "24h", { uploadFile, addRecentUpload, copyToClipboard });
      await expect(result).rejects.toBeInstanceOf(UploadBatchError);
      await expect(result).rejects.toMatchObject({
        message: "Upload failed",
        clipboardCopied: stage === "history",
        ...(stage === "upload" ? { failedFilename: "one.txt", uploads: [] } : {}),
        ...(stage === "history" ? { historyErrorMessage: "Upload failed" } : {}),
        ...(stage === "clipboard" ? { clipboardErrorMessage: "Upload failed" } : {}),
      });
      if (stage === "upload") {
        expect(addRecentUpload).not.toHaveBeenCalled();
        expect(copyToClipboard).not.toHaveBeenCalled();
      } else {
        expect(addRecentUpload).toHaveBeenCalledOnce();
        expect(copyToClipboard).toHaveBeenCalledOnce();
      }
    },
  );
});
