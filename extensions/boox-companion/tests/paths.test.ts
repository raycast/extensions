import { describe, expect, it } from "vitest";
import path from "node:path";
import {
  displayRemotePath,
  isLibraryDocument,
  normalizeRemotePath,
  resolveDownloadPath,
  validateUploadName,
} from "../src/lib/paths";

describe("BOOX paths", () => {
  it("maps user paths to internal storage", () => {
    expect(normalizeRemotePath("/Download")).toBe("/storage/emulated/0/Download");
    expect(normalizeRemotePath("Books/Research")).toBe("/storage/emulated/0/Books/Research");
    expect(normalizeRemotePath("/storage/emulated/0/Pictures")).toBe("/storage/emulated/0/Pictures");
    expect(displayRemotePath("/storage/emulated/0/Download")).toBe("/Download");
  });

  it("validates BOOX file names", () => {
    expect(validateUploadName("book.epub")).toBeUndefined();
    expect(validateUploadName(".hidden.pdf")).toBeDefined();
    expect(validateUploadName("bad:name.pdf")).toBeDefined();
  });

  it("uses the device Library uploader format set", () => {
    expect(isLibraryDocument("paper.docx")).toBe(true);
    expect(isLibraryDocument("book.epub")).toBe(true);
    expect(isLibraryDocument("archive.dmg")).toBe(false);
  });

  it("keeps device-provided download names inside the selected directory", () => {
    const directory = path.join(path.sep, "safe", "downloads");

    expect(resolveDownloadPath(directory, "../../private/report.pdf")).toBe(
      path.join(directory, "..-..-private-report.pdf")
    );
    expect(resolveDownloadPath(directory, "..\\..\\private\\report.pdf")).toBe(
      path.join(directory, "..-..-private-report.pdf")
    );
    expect(resolveDownloadPath(directory, "bad:name?.pdf")).toBe(path.join(directory, "bad-name-.pdf"));
    expect(resolveDownloadPath(directory, "Research/chapter.pdf")).toBe(
      path.join(directory, "Research-chapter.pdf")
    );
    expect(resolveDownloadPath(directory, "Archive\\chapter.pdf")).toBe(
      path.join(directory, "Archive-chapter.pdf")
    );
    expect(() => resolveDownloadPath(directory, "..")).toThrow("invalid file name");
  });
});
