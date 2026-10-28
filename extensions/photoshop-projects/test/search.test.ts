import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sortPhotoshopFiles } from "../src/services/search";
import { PhotoshopFile } from "../src/types";
import { runMdfind } from "../src/utils/spotlight";

function mockFile(overrides: Partial<PhotoshopFile>): PhotoshopFile {
  return {
    id: overrides.id || overrides.path || "/dummy/path.psd",
    name: overrides.name || "test.psd",
    title: overrides.title || "test",
    path: overrides.path || "/dummy/path.psd",
    directory: overrides.directory || "/dummy",
    directoryName: overrides.directoryName || "dummy",
    extension: overrides.extension || "psd",
    sizeInBytes: overrides.sizeInBytes || 1024,
    formattedSize: overrides.formattedSize || "1 KB",
    lastModifiedDate: overrides.lastModifiedDate || new Date("2024-01-01T00:00:00Z"),
    lastOpenedDate: overrides.lastOpenedDate,
    dimensions: overrides.dimensions,
    colorSpace: overrides.colorSpace,
    exists: overrides.exists ?? true,
  };
}

describe("search and sort utilities", () => {
  it("sorts by name ascending and descending", () => {
    const fileA = mockFile({ title: "Apple", path: "/a.psd" });
    const fileB = mockFile({ title: "Banana", path: "/b.psd" });
    const fileC = mockFile({ title: "Cherry", path: "/c.psd" });

    const asc = sortPhotoshopFiles([fileC, fileA, fileB], "name-asc");
    assert.deepEqual(
      asc.map((f) => f.title),
      ["Apple", "Banana", "Cherry"],
    );

    const desc = sortPhotoshopFiles([fileA, fileC, fileB], "name-desc");
    assert.deepEqual(
      desc.map((f) => f.title),
      ["Cherry", "Banana", "Apple"],
    );
  });

  it("sorts by file size ascending and descending", () => {
    const small = mockFile({ title: "Small", sizeInBytes: 100 });
    const medium = mockFile({ title: "Med", sizeInBytes: 500 });
    const large = mockFile({ title: "Large", sizeInBytes: 2000 });

    const asc = sortPhotoshopFiles([large, small, medium], "size-asc");
    assert.deepEqual(
      asc.map((f) => f.title),
      ["Small", "Med", "Large"],
    );

    const desc = sortPhotoshopFiles([small, large, medium], "size-desc");
    assert.deepEqual(
      desc.map((f) => f.title),
      ["Large", "Med", "Small"],
    );
  });

  it("sorts by date modified ascending and descending", () => {
    const oldFile = mockFile({ title: "Old", lastModifiedDate: new Date("2022-01-01") });
    const midFile = mockFile({ title: "Mid", lastModifiedDate: new Date("2023-01-01") });
    const newFile = mockFile({ title: "New", lastModifiedDate: new Date("2024-01-01") });

    const newest = sortPhotoshopFiles([oldFile, newFile, midFile], "date-desc");
    assert.deepEqual(
      newest.map((f) => f.title),
      ["New", "Mid", "Old"],
    );

    const oldest = sortPhotoshopFiles([newFile, oldFile, midFile], "date-asc");
    assert.deepEqual(
      oldest.map((f) => f.title),
      ["Old", "Mid", "New"],
    );
  });

  it("sorts by recent/last opened with fallback to modified date", () => {
    const file1 = mockFile({
      title: "OpenedRecently",
      lastOpenedDate: new Date("2024-05-01"),
      lastModifiedDate: new Date("2023-01-01"),
    });
    const file2 = mockFile({
      title: "ModifiedRecently",
      lastOpenedDate: undefined,
      lastModifiedDate: new Date("2024-04-01"),
    });
    const file3 = mockFile({
      title: "Older",
      lastOpenedDate: new Date("2024-01-01"),
      lastModifiedDate: new Date("2022-01-01"),
    });

    const recent = sortPhotoshopFiles([file3, file2, file1], "recent");
    assert.deepEqual(
      recent.map((f) => f.title),
      ["OpenedRecently", "ModifiedRecently", "Older"],
    );
  });

  it("streams and returns paths without exceeding maxResults", async () => {
    const paths = await runMdfind("kMDItemFSName == '*.ts'", process.cwd(), 3);
    assert.ok(Array.isArray(paths));
    assert.ok(paths.length <= 3);
  });

  describe("UTF-8 chunk splitting in stream processing", () => {
    it("preserves multibyte UTF-8 characters when split across separate stream chunks", async () => {
      const { Readable } = await import("node:stream");
      const { processMdfindStream } = await import("../src/utils/spotlight");

      const stdout = new Readable({ read() {} });

      // Chunk 1: "/dummy/path/caf" + first byte of "é" (0xc3)
      stdout.push(Buffer.from([0x2f, 0x64, 0x75, 0x6d, 0x6d, 0x79, 0x2f, 0x70, 0x61, 0x74, 0x68, 0x2f, 0x63, 0x61, 0x66, 0xc3]));
      // Chunk 2: second byte of "é" (0xa9) + "-project.psd\n"
      stdout.push(Buffer.from([0xa9, 0x2d, 0x70, 0x72, 0x6f, 0x6a, 0x65, 0x63, 0x74, 0x2e, 0x70, 0x73, 0x64, 0x0a]));
      stdout.push(null);

      const paths = await processMdfindStream(stdout, 100, () => true);
      assert.equal(paths.length, 1);
      assert.equal(paths[0], "/dummy/path/café-project.psd");
    });

    it("handles multiple paths delivered across multiple chunks and unterminated final line", async () => {
      const { Readable } = await import("node:stream");
      const { processMdfindStream } = await import("../src/utils/spotlight");

      const stdout = new Readable({ read() {} });

      // Path 1 split across chunks: "/first/path.psd\n/second/"
      stdout.push(Buffer.from("/first/path.psd\n/second/"));
      // Path 2 continuation without trailing newline: "unterminated.psd"
      stdout.push(Buffer.from("unterminated.psd"));
      stdout.push(null);

      const paths = await processMdfindStream(stdout, 100, () => true);
      assert.deepEqual(paths, ["/first/path.psd", "/second/unterminated.psd"]);
    });

    it("handles empty stream gracefully", async () => {
      const { Readable } = await import("node:stream");
      const { processMdfindStream } = await import("../src/utils/spotlight");

      const stdout = new Readable({ read() {} });
      stdout.push(null);

      const paths = await processMdfindStream(stdout, 100, () => true);
      assert.deepEqual(paths, []);
    });
  });
});
