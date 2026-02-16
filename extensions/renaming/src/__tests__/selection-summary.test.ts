import { describe, it, expect } from "vitest";
import { buildSelectionSummary, buildPerFolderSummary, buildAutoSummary } from "../lib/selection-summary";
import type { FileInfo } from "../types";

const jpg1: FileInfo = {
  path: "/tmp/a/photo1.jpg",
  name: "photo1.jpg",
  baseName: "photo1",
  extension: ".jpg",
  isDirectory: false,
};
const jpg2: FileInfo = {
  path: "/tmp/a/photo2.jpg",
  name: "photo2.jpg",
  baseName: "photo2",
  extension: ".jpg",
  isDirectory: false,
};
const png1: FileInfo = {
  path: "/tmp/a/screen.png",
  name: "screen.png",
  baseName: "screen",
  extension: ".png",
  isDirectory: false,
};
const dir1: FileInfo = { path: "/tmp/a/folder", name: "folder", baseName: "folder", extension: "", isDirectory: true };
const noExt: FileInfo = {
  path: "/tmp/a/Makefile",
  name: "Makefile",
  baseName: "Makefile",
  extension: "",
  isDirectory: false,
};
const bFile: FileInfo = {
  path: "/tmp/b/doc.pdf",
  name: "doc.pdf",
  baseName: "doc",
  extension: ".pdf",
  isDirectory: false,
};

describe("buildSelectionSummary", () => {
  it("counts files correctly and groups by extension", () => {
    const result = buildSelectionSummary([jpg1, jpg2, png1]);
    expect(result.totalCount).toBe(3);
    expect(result.byExtension[".jpg"]).toBe(2);
    expect(result.byExtension[".png"]).toBe(1);
  });

  it("skips directories in byExtension and totalCount", () => {
    const result = buildSelectionSummary([jpg1, dir1]);
    expect(result.totalCount).toBe(1);
    expect(result.byExtension[".jpg"]).toBe(1);
    expect(Object.keys(result.byExtension)).toHaveLength(1);
  });

  it("handles files without extension as '(no ext)'", () => {
    const result = buildSelectionSummary([noExt]);
    expect(result.byExtension["(no ext)"]).toBe(1);
  });

  it("summaryText includes total count and extension breakdown", () => {
    const result = buildSelectionSummary([jpg1, jpg2, png1]);
    expect(result.summaryText).toContain("3 files");
    expect(result.summaryText).toContain(".jpg");
    expect(result.summaryText).toContain(".png");
  });

  it("uses 'folder' as noun when all items are directories", () => {
    const dir2: FileInfo = {
      path: "/tmp/a/folder2",
      name: "folder2",
      baseName: "folder2",
      extension: "",
      isDirectory: true,
    };
    const result = buildSelectionSummary([dir1, dir2]);
    expect(result.summaryText).toContain("2 folders");
  });

  it("uses singular for single item", () => {
    const result = buildSelectionSummary([jpg1]);
    expect(result.summaryText).toContain("1 file");
  });
});

describe("buildPerFolderSummary", () => {
  it("returns multi-line string with folder names and counts", () => {
    const map = new Map<string, FileInfo[]>();
    map.set("/tmp/a", [jpg1, jpg2, png1]);
    map.set("/tmp/b", [bFile]);

    const result = buildPerFolderSummary(map);
    expect(result).toContain("4 files total");
    expect(result).toContain("a: 3 files");
    expect(result).toContain("b: 1 file");
  });
});

describe("buildAutoSummary", () => {
  it("returns flat summary for single directory", () => {
    const result = buildAutoSummary([jpg1, jpg2, png1]);
    expect(result).toContain("3 files");
    expect(result).not.toContain("total");
  });

  it("returns per-folder summary for multiple directories", () => {
    const result = buildAutoSummary([jpg1, bFile]);
    expect(result).toContain("total");
    expect(result).toContain("a:");
    expect(result).toContain("b:");
  });
});
