import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BooxClient } from "../src/api/boox-client";
import { StorageEntry } from "../src/models/boox";
import { transferFiles } from "../src/operations/transfer";

describe("file transfers", () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "boox-transfer-test-"));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("skips remote duplicates without uploading them", async () => {
    const file = await createFile("book.epub");
    const client = mockClient({ duplicates: ["book.epub"] });
    const progress = vi.fn();

    const result = await transferFiles({
      client,
      paths: [file],
      mode: "storage",
      destination: "/Books",
      conflictPolicy: "skip",
      onProgress: progress,
    });

    expect(result).toMatchObject({ uploaded: 0, skipped: 1, failed: 0 });
    expect(client.uploadStorage).not.toHaveBeenCalled();
    expect(client.listStorage).not.toHaveBeenCalled();
    expect(progress).toHaveBeenCalledWith(1, 1, "book.epub");
  });

  it("deletes an existing storage file before replacing it", async () => {
    const file = await createFile("book.epub", "new");
    const existing = {
      dir: false,
      name: "book.epub",
      path: "/storage/emulated/0/Books/book.epub",
      size: 3,
      updatedAt: 0,
    };
    const client = mockClient({ duplicates: ["book.epub"], entries: [existing] });

    const result = await transferFiles({
      client,
      paths: [file],
      mode: "storage",
      destination: "/Books",
      conflictPolicy: "replace",
    });

    expect(result).toMatchObject({ uploaded: 1, skipped: 0, failed: 0 });
    expect(client.listStorage).toHaveBeenCalledWith("/storage/emulated/0/Books", 0, 10_000);
    expect(client.deleteStorage).toHaveBeenCalledWith(existing);
    expect(client.uploadStorage).toHaveBeenCalledWith(file, "/storage/emulated/0/Books");
    expect(vi.mocked(client.deleteStorage).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(client.uploadStorage).mock.invocationCallOrder[0]
    );
  });

  it("refuses to replace a same-name folder", async () => {
    const file = await createFile("Archive");
    const client = mockClient({
      duplicates: ["Archive"],
      entries: [
        {
          dir: true,
          name: "Archive",
          path: "/storage/emulated/0/Download/Archive",
          size: 0,
          updatedAt: 0,
        },
      ],
    });

    const result = await transferFiles({
      client,
      paths: [file],
      mode: "storage",
      conflictPolicy: "replace",
    });

    expect(result).toMatchObject({ uploaded: 0, skipped: 0, failed: 1 });
    expect(result.items[0].error).toBe("Archive is an existing folder and cannot be replaced");
    expect(client.deleteStorage).not.toHaveBeenCalled();
    expect(client.uploadStorage).not.toHaveBeenCalled();
  });

  it("continues after one upload fails and reports each outcome", async () => {
    const first = await createFile("first.txt");
    const second = await createFile("second.txt");
    const client = mockClient();
    vi.mocked(client.uploadStorage)
      .mockRejectedValueOnce(new Error("connection reset"))
      .mockResolvedValueOnce(undefined);

    const result = await transferFiles({
      client,
      paths: [first, second],
      mode: "storage",
      conflictPolicy: "skip",
    });

    expect(result).toMatchObject({ uploaded: 1, skipped: 0, failed: 1 });
    expect(result.items.map(({ name, status }) => ({ name, status }))).toEqual([
      { name: "first.txt", status: "failed" },
      { name: "second.txt", status: "uploaded" },
    ]);
  });

  it("deduplicates identical local paths", async () => {
    const file = await createFile("book.pdf");
    const client = mockClient();

    const result = await transferFiles({
      client,
      paths: [file, file],
      mode: "storage",
      conflictPolicy: "skip",
    });

    expect(result.uploaded).toBe(1);
    expect(client.checkDuplicates).toHaveBeenCalledWith(["book.pdf"], "/storage/emulated/0/Download");
    expect(client.uploadStorage).toHaveBeenCalledTimes(1);
  });

  it("never replaces an existing Library document", async () => {
    const file = await createFile("book.pdf");
    const client = mockClient({ duplicates: ["book.pdf"] });

    const result = await transferFiles({
      client,
      paths: [file],
      mode: "library",
      conflictPolicy: "replace",
    });

    expect(result).toMatchObject({ uploaded: 0, skipped: 1, failed: 0 });
    expect(client.uploadLibrary).not.toHaveBeenCalled();
  });

  it("rejects directories and unsupported Library formats before contacting BOOX", async () => {
    const folder = path.join(directory, "folder");
    await mkdir(folder);
    const image = await createFile("cover.png");
    const client = mockClient();

    await expect(
      transferFiles({ client, paths: [folder], mode: "storage", conflictPolicy: "skip" })
    ).rejects.toThrow("folder is not a regular file");
    await expect(
      transferFiles({ client, paths: [image], mode: "library", conflictPolicy: "skip" })
    ).rejects.toThrow("cover.png is not accepted by the BOOX Library uploader");
    expect(client.checkDuplicates).not.toHaveBeenCalled();
  });

  async function createFile(name: string, contents = "data"): Promise<string> {
    const file = path.join(directory, name);
    await writeFile(file, contents);
    return file;
  }
});

function mockClient(options: { duplicates?: string[]; entries?: StorageEntry[] } = {}) {
  return {
    checkDuplicates: vi.fn().mockResolvedValue(options.duplicates ?? []),
    listStorage: vi.fn().mockResolvedValue({
      count: options.entries?.length ?? 0,
      fileCount: options.entries?.length ?? 0,
      folderCount: 0,
      list: options.entries ?? [],
    }),
    deleteStorage: vi.fn().mockResolvedValue(undefined),
    uploadStorage: vi.fn().mockResolvedValue(undefined),
    uploadLibrary: vi.fn().mockResolvedValue(undefined),
    getLibrary: vi.fn().mockResolvedValue({ books: [], shelves: [], bookCount: 0, shelfCount: 0 }),
  } as unknown as BooxClient;
}
