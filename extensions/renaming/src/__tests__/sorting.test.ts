import { describe, it, expect } from "vitest";
import {
  sortFiles,
  getSortFieldLabel,
  getSortFields,
  sortRequiresMetadata,
  sortRequiresExif,
  getRecommendedSort,
} from "../lib/template/sorting";
import type { FileWithMetadata, SortConfig } from "../lib/template/sorting";
import { SortField, SortDirection } from "../types/enums";
import { MOCK_JPG, MOCK_PNG, MOCK_PDF, MOCK_TXT } from "./fixtures/files";
import { MOCK_IMAGE_METADATA, MOCK_BASIC_METADATA } from "./fixtures/metadata";
import type { FileInfo, FileMetadataContext } from "../types";

/**
 * Helper to create a FileWithMetadata from a FileInfo and optional metadata.
 */
function fwm(file: FileInfo, metadata?: FileMetadataContext): FileWithMetadata {
  return metadata ? { file, metadata } : { file };
}

/**
 * Helper to build a FileInfo with a custom name.
 */
function fileWithName(name: string): FileInfo {
  return {
    path: `/tmp/test/${name}`,
    name,
    baseName: name.replace(/\.[^.]+$/, ""),
    extension: name.includes(".") ? name.slice(name.lastIndexOf(".")) : "",
    isDirectory: false,
  };
}

describe("sorting", () => {
  // ─── sortFiles ──────────────────────────────────────────────────────

  describe("sortFiles", () => {
    it("returns a copy without sorting when field is NONE", () => {
      const files: FileWithMetadata[] = [
        fwm(MOCK_PNG, MOCK_BASIC_METADATA),
        fwm(MOCK_JPG, MOCK_IMAGE_METADATA),
        fwm(MOCK_PDF),
      ];
      const config: SortConfig = { field: SortField.NONE, direction: SortDirection.ASC };

      const result = sortFiles(files, config);

      expect(result).toEqual(files);
      expect(result).not.toBe(files); // new array
      expect(result.map((f) => f.file.name)).toEqual(["screenshot.png", "photo.jpg", "document.pdf"]);
    });

    it("sorts by name using natural sort order (file2 before file10)", () => {
      const files: FileWithMetadata[] = [
        fwm(fileWithName("file10.txt")),
        fwm(fileWithName("file2.txt")),
        fwm(fileWithName("file1.txt")),
        fwm(fileWithName("file20.txt")),
      ];
      const config: SortConfig = { field: SortField.NAME, direction: SortDirection.ASC };

      const result = sortFiles(files, config);
      const names = result.map((f) => f.file.name);

      expect(names).toEqual(["file1.txt", "file2.txt", "file10.txt", "file20.txt"]);
    });

    it("sorts by date created", () => {
      const early = new Date("2023-01-01T00:00:00Z");
      const mid = new Date("2024-06-01T00:00:00Z");
      const late = new Date("2025-01-01T00:00:00Z");

      const files: FileWithMetadata[] = [
        fwm(MOCK_PNG, { size: 100, created: late, modified: late }),
        fwm(MOCK_JPG, { size: 200, created: early, modified: early }),
        fwm(MOCK_PDF, { size: 300, created: mid, modified: mid }),
      ];
      const config: SortConfig = { field: SortField.DATE_CREATED, direction: SortDirection.ASC };

      const result = sortFiles(files, config);
      const names = result.map((f) => f.file.name);

      expect(names).toEqual(["photo.jpg", "document.pdf", "screenshot.png"]);
    });

    it("sorts by date modified", () => {
      const early = new Date("2023-01-01T00:00:00Z");
      const mid = new Date("2024-06-01T00:00:00Z");
      const late = new Date("2025-01-01T00:00:00Z");

      const files: FileWithMetadata[] = [
        fwm(MOCK_PDF, { size: 300, created: mid, modified: late }),
        fwm(MOCK_JPG, { size: 200, created: early, modified: early }),
        fwm(MOCK_PNG, { size: 100, created: late, modified: mid }),
      ];
      const config: SortConfig = { field: SortField.DATE_MODIFIED, direction: SortDirection.ASC };

      const result = sortFiles(files, config);
      const names = result.map((f) => f.file.name);

      expect(names).toEqual(["photo.jpg", "screenshot.png", "document.pdf"]);
    });

    it("sorts by date taken from EXIF, falling back to modified date", () => {
      const earlyTaken = new Date("2022-06-01T00:00:00Z");
      const midModified = new Date("2024-03-01T00:00:00Z");
      const lateTaken = new Date("2025-12-01T00:00:00Z");

      const withExif: FileMetadataContext = {
        size: 100,
        created: new Date("2025-01-01"),
        modified: new Date("2025-01-01"),
        exif: { dateTaken: lateTaken },
      };
      const withEarlyExif: FileMetadataContext = {
        size: 200,
        created: new Date("2025-01-01"),
        modified: new Date("2025-01-01"),
        exif: { dateTaken: earlyTaken },
      };
      const withoutExif: FileMetadataContext = {
        size: 300,
        created: midModified,
        modified: midModified,
      };

      const files: FileWithMetadata[] = [
        fwm(MOCK_PNG, withExif),
        fwm(MOCK_JPG, withEarlyExif),
        fwm(MOCK_PDF, withoutExif),
      ];
      const config: SortConfig = { field: SortField.DATE_TAKEN, direction: SortDirection.ASC };

      const result = sortFiles(files, config);
      const names = result.map((f) => f.file.name);

      // earlyTaken < midModified (fallback) < lateTaken
      expect(names).toEqual(["photo.jpg", "document.pdf", "screenshot.png"]);
    });

    it("sorts by file size", () => {
      const files: FileWithMetadata[] = [
        fwm(MOCK_PNG, { size: 5000, created: new Date(), modified: new Date() }),
        fwm(MOCK_JPG, { size: 100, created: new Date(), modified: new Date() }),
        fwm(MOCK_PDF, { size: 3000, created: new Date(), modified: new Date() }),
      ];
      const config: SortConfig = { field: SortField.SIZE, direction: SortDirection.ASC };

      const result = sortFiles(files, config);
      const names = result.map((f) => f.file.name);

      expect(names).toEqual(["photo.jpg", "document.pdf", "screenshot.png"]);
    });

    it("reverses order when direction is DESC", () => {
      const files: FileWithMetadata[] = [
        fwm(fileWithName("alpha.txt")),
        fwm(fileWithName("charlie.txt")),
        fwm(fileWithName("bravo.txt")),
      ];
      const ascConfig: SortConfig = { field: SortField.NAME, direction: SortDirection.ASC };
      const descConfig: SortConfig = { field: SortField.NAME, direction: SortDirection.DESC };

      const asc = sortFiles(files, ascConfig);
      const desc = sortFiles(files, descConfig);

      expect(asc.map((f) => f.file.name)).toEqual(["alpha.txt", "bravo.txt", "charlie.txt"]);
      expect(desc.map((f) => f.file.name)).toEqual(["charlie.txt", "bravo.txt", "alpha.txt"]);
    });

    it("does not modify the original array", () => {
      const files: FileWithMetadata[] = [
        fwm(fileWithName("z.txt")),
        fwm(fileWithName("a.txt")),
        fwm(fileWithName("m.txt")),
      ];
      const originalOrder = files.map((f) => f.file.name);
      const config: SortConfig = { field: SortField.NAME, direction: SortDirection.ASC };

      sortFiles(files, config);

      expect(files.map((f) => f.file.name)).toEqual(originalOrder);
    });

    it("handles undefined metadata by sorting those items to the end", () => {
      const files: FileWithMetadata[] = [
        fwm(MOCK_PNG), // no metadata
        fwm(MOCK_JPG, { size: 100, created: new Date("2024-01-01"), modified: new Date("2024-01-01") }),
        fwm(MOCK_PDF), // no metadata
        fwm(MOCK_TXT, { size: 50, created: new Date("2023-01-01"), modified: new Date("2023-01-01") }),
      ];

      // Test with DATE_CREATED - undefined metadata files should sort to end
      const byDate: SortConfig = { field: SortField.DATE_CREATED, direction: SortDirection.ASC };
      const dateResult = sortFiles(files, byDate);
      const dateNames = dateResult.map((f) => f.file.name);

      // Files with dates first (sorted), then files without metadata
      expect(dateNames[0]).toBe("notes.txt"); // 2023
      expect(dateNames[1]).toBe("photo.jpg"); // 2024
      // The last two have no metadata - order among them is stable (both return 0)
      expect(dateNames.slice(2).sort()).toEqual(["document.pdf", "screenshot.png"]);

      // Test with SIZE - undefined metadata files should sort to end
      const bySize: SortConfig = { field: SortField.SIZE, direction: SortDirection.ASC };
      const sizeResult = sortFiles(files, bySize);
      const sizeNames = sizeResult.map((f) => f.file.name);

      expect(sizeNames[0]).toBe("notes.txt"); // size 50
      expect(sizeNames[1]).toBe("photo.jpg"); // size 100
      expect(sizeNames.slice(2).sort()).toEqual(["document.pdf", "screenshot.png"]);
    });
  });

  // ─── getSortFieldLabel ──────────────────────────────────────────────

  describe("getSortFieldLabel", () => {
    it("returns a non-empty string for each SortField value", () => {
      for (const field of Object.values(SortField)) {
        const label = getSortFieldLabel(field);
        expect(label).toBeTruthy();
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      }
    });

    it("returns expected labels for known fields", () => {
      expect(getSortFieldLabel(SortField.NONE)).toBe("Original Order");
      expect(getSortFieldLabel(SortField.NAME)).toBe("Name");
      expect(getSortFieldLabel(SortField.DATE_TAKEN)).toBe("Date Taken (EXIF)");
      expect(getSortFieldLabel(SortField.SIZE)).toBe("File Size");
    });
  });

  // ─── getSortFields ─────────────────────────────────────────────────

  describe("getSortFields", () => {
    it("returns an array containing all SortField values", () => {
      const fields = getSortFields();
      const allValues = Object.values(SortField);

      expect(fields).toHaveLength(allValues.length);

      for (const value of allValues) {
        expect(fields.some((f) => f.value === value)).toBe(true);
      }
    });

    it("each entry has a value and a non-empty label", () => {
      const fields = getSortFields();

      for (const entry of fields) {
        expect(entry).toHaveProperty("value");
        expect(entry).toHaveProperty("label");
        expect(typeof entry.label).toBe("string");
        expect(entry.label.length).toBeGreaterThan(0);
      }
    });
  });

  // ─── sortRequiresMetadata ──────────────────────────────────────────

  describe("sortRequiresMetadata", () => {
    it("returns false for NONE", () => {
      expect(sortRequiresMetadata(SortField.NONE)).toBe(false);
    });

    it("returns false for NAME", () => {
      expect(sortRequiresMetadata(SortField.NAME)).toBe(false);
    });

    it("returns true for DATE_CREATED", () => {
      expect(sortRequiresMetadata(SortField.DATE_CREATED)).toBe(true);
    });

    it("returns true for DATE_MODIFIED", () => {
      expect(sortRequiresMetadata(SortField.DATE_MODIFIED)).toBe(true);
    });

    it("returns true for DATE_TAKEN", () => {
      expect(sortRequiresMetadata(SortField.DATE_TAKEN)).toBe(true);
    });

    it("returns true for SIZE", () => {
      expect(sortRequiresMetadata(SortField.SIZE)).toBe(true);
    });
  });

  // ─── sortRequiresExif ──────────────────────────────────────────────

  describe("sortRequiresExif", () => {
    it("returns true only for DATE_TAKEN", () => {
      expect(sortRequiresExif(SortField.DATE_TAKEN)).toBe(true);
    });

    it("returns false for all other fields", () => {
      const nonExifFields = [
        SortField.NONE,
        SortField.NAME,
        SortField.DATE_CREATED,
        SortField.DATE_MODIFIED,
        SortField.SIZE,
      ];

      for (const field of nonExifFields) {
        expect(sortRequiresExif(field)).toBe(false);
      }
    });
  });

  // ─── getRecommendedSort ────────────────────────────────────────────

  describe("getRecommendedSort", () => {
    it("returns DATE_TAKEN for image category", () => {
      expect(getRecommendedSort("image")).toBe(SortField.DATE_TAKEN);
    });

    it("returns DATE_MODIFIED for video category", () => {
      expect(getRecommendedSort("video")).toBe(SortField.DATE_MODIFIED);
    });

    it("returns NAME for document category", () => {
      expect(getRecommendedSort("document")).toBe(SortField.NAME);
    });

    it("returns NAME (default) for unknown categories", () => {
      expect(getRecommendedSort("unknown")).toBe(SortField.NAME);
      expect(getRecommendedSort("")).toBe(SortField.NAME);
      expect(getRecommendedSort("random_category")).toBe(SortField.NAME);
    });
  });
});
