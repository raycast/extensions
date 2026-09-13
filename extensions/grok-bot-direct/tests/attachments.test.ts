import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  attachmentOf,
  downloadFile,
  uploadFiles,
} from "../src/core/attachments";

describe("file uploads", () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "grok-file-test-"));
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  it("downloads exact bytes without executing or overwriting an existing file", async () => {
    const command = vi.fn().mockResolvedValue({
      bytesBase64: Buffer.from("fixture").toString("base64"),
      totalSize: 7,
    });
    const path = await downloadFile(
      { command },
      "bot",
      "/host/file.txt",
      "../../file.txt",
      directory,
    );
    expect(path.startsWith(directory + "/")).toBe(true);
    expect(await readFile(path, "utf8")).toBe("fixture");
    expect(command.mock.calls[0][1]).toMatchObject({
      agentId: "bot",
      path: "/host/file.txt",
      offset: 0,
    });
  });
  it.each([
    null,
    { bytesBase64: "a", totalSize: 1 },
    { bytesBase64: "", totalSize: 10 },
    { bytesBase64: "YQ==", totalSize: 0 },
    { bytesBase64: "", totalSize: 201 * 1024 * 1024 },
  ])(
    "removes incomplete downloads after invalid responses",
    async (response) => {
      await expect(
        downloadFile(
          { command: vi.fn().mockResolvedValue(response) },
          "bot",
          "/host/file",
          "file",
          directory,
        ),
      ).rejects.toThrow();
      expect(await readdir(directory)).toEqual([]);
    },
  );
  it("detects a file that changes size while downloading", async () => {
    const command = vi
      .fn()
      .mockResolvedValueOnce({ bytesBase64: "YQ==", totalSize: 2 })
      .mockResolvedValueOnce({ bytesBase64: "Yg==", totalSize: 3 });
    await expect(
      downloadFile({ command }, "bot", "/host/file", "file", directory),
    ).rejects.toThrow("changed");
    expect(await readdir(directory)).toEqual([]);
  });
  it("handles empty files and rejects external URLs for authenticated download", async () => {
    const command = vi
      .fn()
      .mockResolvedValue({ bytesBase64: "", totalSize: 0 });
    const path = await downloadFile(
      { command },
      "bot",
      "/host/empty",
      "empty",
      directory,
    );
    expect((await readFile(path)).length).toBe(0);
    await expect(
      downloadFile(
        { command },
        "bot",
        "https://external.test/file",
        "file",
        directory,
      ),
    ).rejects.toThrow("Grok Bot app");
  });
  it("recognizes attachment message contracts", () => {
    expect(
      attachmentOf({
        id: "u",
        kind: "user-attachment",
        file_path: "/host/proof.txt",
        file_name: "proof.txt",
      }),
    ).toEqual({ path: "/host/proof.txt", name: "proof.txt" });
    expect(
      attachmentOf({
        id: "a",
        kind: "send-message",
        message: {
          type: "attachment",
          url: "/host/a.txt",
          file_name: "Result.txt",
        },
      }),
    ).toEqual({ path: "/host/a.txt", name: "Result.txt" });
    expect(
      attachmentOf({
        id: "a",
        kind: "send-message",
        message: { type: "attachment", url: "/host/a.txt" },
      })?.name,
    ).toBe("a.txt");
    expect(attachmentOf({ id: "a", kind: "message" })).toBeUndefined();
  });
  it("uploads exact file bytes and uses the returned host path", async () => {
    const path = join(directory, "sample.txt");
    await writeFile(path, "fixture\n");
    const command = vi
      .fn()
      .mockResolvedValue({ path: "/host/attachments/hash.txt" });
    expect(await uploadFiles({ command }, "bot", [path])).toEqual([
      { path: "/host/attachments/hash.txt", name: "sample.txt" },
    ]);
    expect(command).toHaveBeenCalledWith(
      "uploadAttachment",
      {
        agentId: "bot",
        filename: "sample.txt",
        bytesBase64: Buffer.from("fixture\n").toString("base64"),
      },
      { mutation: true },
    );
  });
  it("streams larger files as bounded sequential chunks", async () => {
    const path = join(directory, "sample.bin");
    await writeFile(path, Buffer.alloc(1024 * 1024 + 3, 7));
    const command = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ committedPath: "/host/complete.bin" });
    expect(await uploadFiles({ command }, "bot", [path])).toEqual([
      { path: "/host/complete.bin", name: "sample.bin" },
    ]);
    const first = command.mock.calls[0][1],
      last = command.mock.calls[1][1];
    expect(first.offset).toBe(0);
    expect(last.offset).toBe(1024 * 1024);
    expect(first.uploadId).toBe(last.uploadId);
    expect(Buffer.from(last.bytesBase64, "base64")).toEqual(Buffer.alloc(3, 7));
  });
  it("validates the whole selection before any upload", async () => {
    const path = join(directory, "fine.txt");
    await writeFile(path, "safe");
    const command = vi.fn();
    await expect(
      uploadFiles({ command }, "bot", [path, directory]),
    ).rejects.toThrow("regular file");
    expect(command).not.toHaveBeenCalled();
    await expect(
      uploadFiles({ command }, "bot", Array(7).fill(path)),
    ).rejects.toThrow("six");
  });
  it("refuses oversized files", async () => {
    const path = join(directory, "large.bin");
    await writeFile(path, Buffer.alloc(25 * 1024 * 1024 + 1));
    const command = vi.fn();
    await expect(uploadFiles({ command }, "bot", [path])).rejects.toThrow(
      "25 MB",
    );
    expect(command).not.toHaveBeenCalled();
  });
  it("requires a valid completion receipt", async () => {
    const path = join(directory, "sample.txt");
    await writeFile(path, "fixture");
    await expect(
      uploadFiles({ command: vi.fn().mockResolvedValue(null) }, "bot", [path]),
    ).rejects.toThrow("Invalid attachment");
  });
  it("does not retry an upload failure", async () => {
    const path = join(directory, "sample.txt");
    await writeFile(path, "fixture");
    const command = vi.fn().mockRejectedValue(new Error("Connection lost"));
    await expect(uploadFiles({ command }, "bot", [path])).rejects.toThrow(
      "Connection lost",
    );
    expect(command).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed chunk responses", async () => {
    const path = join(directory, "sample.bin");
    await writeFile(path, Buffer.alloc(1024 * 1024 + 1));
    await expect(
      uploadFiles({ command: vi.fn().mockResolvedValue(null) }, "bot", [path]),
    ).rejects.toThrow("chunk response");
  });
});
