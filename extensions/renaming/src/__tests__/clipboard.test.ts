import { describe, it, expect } from "vitest";
import {
  parseClipboard,
  mapClipboardToFiles,
  getClipboardMappingStatus,
  validateClipboardNames,
  getClipboardFormatHint,
} from "../lib/clipboard";
import { ClipboardFormat } from "../types/enums";
import { MOCK_JPG, MOCK_PNG, MOCK_PDF } from "./fixtures/files";

// ---------------------------------------------------------------------------
// parseClipboard
// ---------------------------------------------------------------------------

describe("parseClipboard", () => {
  describe("empty / whitespace input", () => {
    it("returns empty names for empty string", () => {
      const result = parseClipboard("");
      expect(result.names).toEqual([]);
      expect(result.format).toBe(ClipboardFormat.NEWLINE);
      expect(result.hasExtensions).toBe(false);
    });

    it("returns empty names for whitespace-only string", () => {
      const result = parseClipboard("   \n  \t  ");
      expect(result.names).toEqual([]);
    });

    it("returns empty names for undefined-ish empty string", () => {
      const result = parseClipboard("  ");
      expect(result.names).toEqual([]);
      expect(result.hasExtensions).toBe(false);
    });
  });

  describe("newline-separated names", () => {
    it("parses names separated by newlines", () => {
      const result = parseClipboard("alpha\nbeta\ngamma");
      expect(result.names).toEqual(["alpha", "beta", "gamma"]);
      expect(result.format).toBe(ClipboardFormat.NEWLINE);
    });

    it("handles Windows line endings (\\r\\n)", () => {
      const result = parseClipboard("alpha\r\nbeta\r\ngamma");
      expect(result.names).toEqual(["alpha", "beta", "gamma"]);
      expect(result.format).toBe(ClipboardFormat.NEWLINE);
    });

    it("handles old Mac line endings (\\r)", () => {
      const result = parseClipboard("alpha\rbeta\rgamma");
      expect(result.names).toEqual(["alpha", "beta", "gamma"]);
      expect(result.format).toBe(ClipboardFormat.NEWLINE);
    });
  });

  describe("tab-separated names", () => {
    it("parses names separated by tabs on a single line", () => {
      const result = parseClipboard("alpha\tbeta\tgamma\tdelta");
      expect(result.names).toEqual(["alpha", "beta", "gamma", "delta"]);
      expect(result.format).toBe(ClipboardFormat.TAB);
    });

    it("parses grid data (tabs on multiple lines)", () => {
      const result = parseClipboard("a1\ta2\nb1\tb2");
      // Multiple lines with tabs -> flatMap all tab-separated values
      expect(result.names).toEqual(["a1", "a2", "b1", "b2"]);
      expect(result.format).toBe(ClipboardFormat.TAB);
    });
  });

  describe("comma-separated names", () => {
    it("parses names separated by commas", () => {
      const result = parseClipboard("alpha,beta,gamma,delta,epsilon");
      expect(result.names).toEqual(["alpha", "beta", "gamma", "delta", "epsilon"]);
      expect(result.format).toBe(ClipboardFormat.COMMA);
    });

    it("handles quoted CSV values", () => {
      const result = parseClipboard('"file one","file, two","file three"');
      expect(result.names).toEqual(["file one", "file, two", "file three"]);
      expect(result.format).toBe(ClipboardFormat.COMMA);
    });
  });

  describe("auto-detection and tie-breaking", () => {
    it("comma wins when it produces more items than newline", () => {
      // 3 items by newline, 6 items by comma -> comma wins
      const result = parseClipboard("a,b\nc,d\ne,f");
      expect(result.format).toBe(ClipboardFormat.COMMA);
    });

    it("chooses format producing the most items", () => {
      // 2 items by newline, 4 items by tab -> tab wins
      const result = parseClipboard("a\tb\tc\td");
      expect(result.names).toEqual(["a", "b", "c", "d"]);
      expect(result.format).toBe(ClipboardFormat.TAB);
    });

    it("newline wins tie against tab and comma", () => {
      // Single name -> all formats produce 1 item -> newline wins
      const result = parseClipboard("single");
      expect(result.names).toEqual(["single"]);
      expect(result.format).toBe(ClipboardFormat.NEWLINE);
    });
  });

  describe("hasExtensions detection", () => {
    it("detects names with extensions", () => {
      const result = parseClipboard("photo.jpg\nimage.png");
      expect(result.hasExtensions).toBe(true);
    });

    it("returns false when no extensions present", () => {
      const result = parseClipboard("photo\nimage\ndocument");
      expect(result.hasExtensions).toBe(false);
    });

    it("returns true if at least one name has an extension", () => {
      const result = parseClipboard("photo\nimage.png\ndocument");
      expect(result.hasExtensions).toBe(true);
    });

    it("does not treat leading dot as extension", () => {
      // ".hidden" has lastDot at 0, so lastDot > 0 is false
      const result = parseClipboard(".hidden");
      expect(result.hasExtensions).toBe(false);
    });

    it("does not treat trailing dot as extension", () => {
      // "file." has lastDot at the end, lastDot < length-1 is false
      const result = parseClipboard("file.");
      expect(result.hasExtensions).toBe(false);
    });
  });

  describe("trimming and filtering", () => {
    it("trims whitespace from names", () => {
      const result = parseClipboard("  alpha  \n  beta  \n  gamma  ");
      expect(result.names).toEqual(["alpha", "beta", "gamma"]);
    });

    it("filters out empty lines", () => {
      const result = parseClipboard("alpha\n\nbeta\n\n\ngamma");
      expect(result.names).toEqual(["alpha", "beta", "gamma"]);
    });

    it("filters out whitespace-only lines", () => {
      const result = parseClipboard("alpha\n   \nbeta");
      expect(result.names).toEqual(["alpha", "beta"]);
    });
  });
});

// ---------------------------------------------------------------------------
// mapClipboardToFiles
// ---------------------------------------------------------------------------

describe("mapClipboardToFiles", () => {
  const files = [MOCK_JPG, MOCK_PNG, MOCK_PDF];

  it("maps equal number of names and files", () => {
    const result = mapClipboardToFiles(files, ["one", "two", "three"]);
    expect(result).toHaveLength(3);
    expect(result[0]!.file).toBe(MOCK_JPG);
    expect(result[0]!.newName).toBe("one.jpg");
    expect(result[0]!.hasMatch).toBe(true);
    expect(result[1]!.newName).toBe("two.png");
    expect(result[2]!.newName).toBe("three.pdf");
  });

  it("ignores extra names when more names than files", () => {
    const result = mapClipboardToFiles(files, ["one", "two", "three", "four", "five"]);
    expect(result).toHaveLength(3);
    expect(result[0]!.hasMatch).toBe(true);
    expect(result[1]!.hasMatch).toBe(true);
    expect(result[2]!.hasMatch).toBe(true);
  });

  it("keeps original names for unmatched files when fewer names than files", () => {
    const result = mapClipboardToFiles(files, ["renamed"]);
    expect(result).toHaveLength(3);
    expect(result[0]!.hasMatch).toBe(true);
    expect(result[0]!.newName).toBe("renamed.jpg");
    expect(result[1]!.hasMatch).toBe(false);
    expect(result[1]!.newName).toBe("screenshot.png");
    expect(result[2]!.hasMatch).toBe(false);
    expect(result[2]!.newName).toBe("document.pdf");
  });

  describe("preserveExtension", () => {
    it("appends extension when preserveExtension=true and name has no extension", () => {
      const result = mapClipboardToFiles(files, ["newname"], true);
      expect(result[0]!.newName).toBe("newname.jpg");
    });

    it("does not double-add extension when name already has one", () => {
      const result = mapClipboardToFiles(files, ["newname.webp"], true);
      // name includes a dot so nameHasExt is true -> extension not appended
      expect(result[0]!.newName).toBe("newname.webp");
    });

    it("keeps names as-is when preserveExtension=false", () => {
      const result = mapClipboardToFiles(files, ["bare"], false);
      expect(result[0]!.newName).toBe("bare");
    });

    it("defaults preserveExtension to true", () => {
      const result = mapClipboardToFiles(files, ["test"]);
      // Default preserveExtension=true, extension ".jpg" is truthy -> appended
      expect(result[0]!.newName).toBe("test.jpg");
    });
  });
});

// ---------------------------------------------------------------------------
// getClipboardMappingStatus
// ---------------------------------------------------------------------------

describe("getClipboardMappingStatus", () => {
  it("returns error when nameCount is 0", () => {
    const result = getClipboardMappingStatus(5, 0);
    expect(result.type).toBe("error");
    expect(result.message).toBe("Clipboard is empty or contains no valid names");
  });

  it("returns success when nameCount equals fileCount", () => {
    const result = getClipboardMappingStatus(3, 3);
    expect(result.type).toBe("success");
    expect(result.message).toBe("3 names will be applied to 3 files");
  });

  describe("fewer names than files", () => {
    it("uses singular when 1 file will keep original name", () => {
      const result = getClipboardMappingStatus(3, 2);
      expect(result.type).toBe("warning");
      expect(result.message).toBe("2 names for 3 files. 1 file will keep original name.");
    });

    it("uses plural when multiple files will keep original names", () => {
      const result = getClipboardMappingStatus(5, 2);
      expect(result.type).toBe("warning");
      expect(result.message).toBe("2 names for 5 files. 3 files will keep original names.");
    });
  });

  describe("more names than files", () => {
    it("uses singular when 1 name will not be used", () => {
      const result = getClipboardMappingStatus(2, 3);
      expect(result.type).toBe("warning");
      expect(result.message).toBe("3 names for 2 files. 1 name will not be used.");
    });

    it("uses plural when multiple names will not be used", () => {
      const result = getClipboardMappingStatus(2, 5);
      expect(result.type).toBe("warning");
      expect(result.message).toBe("5 names for 2 files. 3 names will not be used.");
    });
  });
});

// ---------------------------------------------------------------------------
// validateClipboardNames
// ---------------------------------------------------------------------------

describe("validateClipboardNames", () => {
  it("returns valid for a list of unique clean names", () => {
    const result = validateClipboardNames(["alpha", "beta", "gamma"]);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  describe("duplicate detection (case-insensitive)", () => {
    it("reports exact duplicates", () => {
      const result = validateClipboardNames(["file", "file"]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Duplicate names");
      expect(result.errors[0]).toContain("file");
    });

    it("reports case-insensitive duplicates", () => {
      const result = validateClipboardNames(["File", "file"]);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Duplicate names");
    });

    it("truncates long duplicate lists with ellipsis", () => {
      const result = validateClipboardNames(["a", "a", "a", "a", "a"]);
      // 4 duplicates -> sliced to 3 + "..."
      expect(result.errors[0]).toContain("...");
    });
  });

  describe("invalid characters", () => {
    it("errors on names with colons", () => {
      const result = validateClipboardNames(["file:name"]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining("invalid characters"));
    });

    it("errors on names with slashes", () => {
      const result = validateClipboardNames(["path/name"]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining("invalid characters"));
    });

    it('errors on names with special characters (*, ?, <, >, |, ")', () => {
      const names = ["star*", "question?", "less<", "greater>", "pipe|", 'quote"'];
      const result = validateClipboardNames(names);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining("6 names contain"));
    });

    it("uses singular form for a single invalid name", () => {
      const result = validateClipboardNames(["bad*name"]);
      expect(result.errors).toContainEqual(expect.stringContaining("1 name contains"));
    });
  });

  describe("empty names", () => {
    it("reports empty names", () => {
      const result = validateClipboardNames([""]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("empty name");
    });

    it("reports whitespace-only names as empty", () => {
      const result = validateClipboardNames(["   "]);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("1 empty name");
    });

    it("uses plural for multiple empty names", () => {
      const result = validateClipboardNames(["", "", ""]);
      expect(result.valid).toBe(false);
      // Errors include both duplicates (empty strings are case-insensitive dupes)
      // and the empty name count
      const emptyError = result.errors.find((e) => e.includes("empty name"));
      expect(emptyError).toContain("3 empty names");
    });
  });

  describe("mixed issues", () => {
    it("reports multiple error types together", () => {
      const result = validateClipboardNames(["valid", "valid", "bad/char", ""]);
      expect(result.valid).toBe(false);
      // Should have errors for: duplicates, invalid chars, and empty names
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ---------------------------------------------------------------------------
// getClipboardFormatHint
// ---------------------------------------------------------------------------

describe("getClipboardFormatHint", () => {
  it("returns correct hint for NEWLINE format", () => {
    expect(getClipboardFormatHint(ClipboardFormat.NEWLINE)).toBe("One name per line");
  });

  it("returns correct hint for TAB format", () => {
    expect(getClipboardFormatHint(ClipboardFormat.TAB)).toBe("Tab-separated names (like from spreadsheet)");
  });

  it("returns correct hint for COMMA format", () => {
    expect(getClipboardFormatHint(ClipboardFormat.COMMA)).toBe("Comma-separated names");
  });
});
