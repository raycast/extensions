import { describe, it, expect } from "vitest";
import {
  resolveVariable,
  requiresMetadata,
  requiresExif,
  requiresSpotlight,
  getRequiredDateSource,
} from "../lib/template/variables";
import type { TemplateContext, TemplateVariableToken, FileInfo } from "../types";
import { TemplateDateSource } from "../types/enums";

// Mock file for testing
const mockFile: FileInfo = {
  path: "/Users/test/Photos/vacation_photo.jpg",
  name: "vacation_photo.jpg",
  baseName: "vacation_photo",
  extension: "jpg",
  isDirectory: false,
};

// Create a context helper
function createContext(overrides: Partial<TemplateContext> = {}): TemplateContext {
  return {
    file: mockFile,
    index: 0,
    total: 10,
    dateSource: TemplateDateSource.NOW,
    counter: { start: 1, step: 1, padding: 3 },
    ...overrides,
  };
}

// Create a variable token helper
function createToken(name: string, format?: string): TemplateVariableToken {
  return {
    type: "variable",
    name,
    format,
    fullMatch: format ? `{${name}:${format}}` : `{${name}}`,
  };
}

describe("resolveVariable", () => {
  describe("basic variables", () => {
    it("resolves {original} to base filename", () => {
      const result = resolveVariable(createToken("original"), createContext());
      expect(result).toBe("vacation_photo");
    });

    it("resolves {extension} to file extension", () => {
      const result = resolveVariable(createToken("extension"), createContext());
      expect(result).toBe("jpg");
    });

    it("returns fullMatch for unknown variables", () => {
      const token = createToken("unknownVar");
      const result = resolveVariable(token, createContext());
      expect(result).toBe("{unknownVar}");
    });
  });

  describe("counter variable", () => {
    it("resolves counter with default padding", () => {
      const context = createContext({ index: 0 });
      const result = resolveVariable(createToken("counter", "001"), context);
      expect(result).toBe("001");
    });

    it("resolves counter with custom start", () => {
      const context = createContext({
        index: 0,
        counter: { start: 10, step: 1, padding: 3 },
      });
      const result = resolveVariable(createToken("counter", "000"), context);
      expect(result).toBe("010");
    });

    it("resolves counter with custom step", () => {
      const context = createContext({
        index: 2, // Third file
        counter: { start: 100, step: 10, padding: 3 },
      });
      const result = resolveVariable(createToken("counter", "000"), context);
      expect(result).toBe("120"); // 100 + (2 * 10)
    });

    it("uses format string for padding", () => {
      const context = createContext({ index: 4 });
      const result = resolveVariable(createToken("counter", "0000"), context);
      expect(result).toBe("0005"); // index 4 + start 1 = 5
    });
  });

  describe("date/time variables", () => {
    // Use metadata with fixed dates to test date formatting
    const fixedDateMetadata = {
      size: 1000,
      created: new Date("2024-06-15T14:30:45"),
      modified: new Date("2024-06-15T14:30:45"),
    };

    it("resolves {date} with default format using modified date", () => {
      const context = createContext({ dateSource: TemplateDateSource.MODIFIED, metadata: fixedDateMetadata });
      const result = resolveVariable(createToken("date"), context);
      expect(result).toBe("2024-06-15");
    });

    it("resolves {date} with custom format", () => {
      const context = createContext({ dateSource: TemplateDateSource.MODIFIED, metadata: fixedDateMetadata });
      const result = resolveVariable(createToken("date", "YYYYMMDD"), context);
      expect(result).toBe("20240615");
    });

    it("resolves {time} with default format", () => {
      const context = createContext({ dateSource: TemplateDateSource.MODIFIED, metadata: fixedDateMetadata });
      const result = resolveVariable(createToken("time"), context);
      expect(result).toBe("14-30-45");
    });

    it("resolves {time} with custom format", () => {
      const context = createContext({ dateSource: TemplateDateSource.MODIFIED, metadata: fixedDateMetadata });
      const result = resolveVariable(createToken("time", "HHmmss"), context);
      expect(result).toBe("143045");
    });

    it("resolves {year}", () => {
      const context = createContext({ dateSource: TemplateDateSource.MODIFIED, metadata: fixedDateMetadata });
      const result = resolveVariable(createToken("year"), context);
      expect(result).toBe("2024");
    });

    it("resolves {month} with padding", () => {
      const context = createContext({ dateSource: TemplateDateSource.MODIFIED, metadata: fixedDateMetadata });
      const result = resolveVariable(createToken("month", "MM"), context);
      expect(result).toBe("06");
    });

    it("resolves {day} with padding", () => {
      const context = createContext({ dateSource: TemplateDateSource.MODIFIED, metadata: fixedDateMetadata });
      const result = resolveVariable(createToken("day", "DD"), context);
      expect(result).toBe("15");
    });
  });

  describe("date source", () => {
    const metadata = {
      size: 1000,
      created: new Date("2024-01-10T08:00:00"),
      modified: new Date("2024-02-20T16:00:00"),
      exif: {
        dateTaken: new Date("2024-01-05T12:00:00"),
      },
    };

    it("uses 'now' date source", () => {
      // Can't easily mock time, so just verify it returns a date in expected format
      const context = createContext({ dateSource: TemplateDateSource.NOW, metadata });
      const result = resolveVariable(createToken("date"), context);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("uses 'created' date source", () => {
      const context = createContext({ dateSource: TemplateDateSource.CREATED, metadata });
      const result = resolveVariable(createToken("date"), context);
      expect(result).toBe("2024-01-10");
    });

    it("uses 'modified' date source", () => {
      const context = createContext({ dateSource: TemplateDateSource.MODIFIED, metadata });
      const result = resolveVariable(createToken("date"), context);
      expect(result).toBe("2024-02-20");
    });

    it("uses 'exif' date source", () => {
      const context = createContext({ dateSource: TemplateDateSource.EXIF, metadata });
      const result = resolveVariable(createToken("date"), context);
      expect(result).toBe("2024-01-05");
    });

    it("falls back to modified when exif date is missing", () => {
      const metadataNoExif = { ...metadata, exif: undefined };
      const context = createContext({
        dateSource: TemplateDateSource.EXIF,
        metadata: metadataNoExif,
      });
      const result = resolveVariable(createToken("date"), context);
      expect(result).toBe("2024-02-20");
    });
  });

  describe("random and uuid", () => {
    it("generates random string of default length", () => {
      const result = resolveVariable(createToken("random"), createContext());
      expect(result).toMatch(/^[a-z0-9]{6}$/);
    });

    it("generates random string of specified length", () => {
      const result = resolveVariable(createToken("random", "10"), createContext());
      expect(result).toMatch(/^[a-z0-9]{10}$/);
    });

    it("generates valid UUID", () => {
      const result = resolveVariable(createToken("uuid"), createContext());
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });

  describe("file metadata variables", () => {
    const metadata = {
      size: 2048576,
      created: new Date("2024-01-15T10:00:00"),
      modified: new Date("2024-02-20T14:30:00"),
    };

    it("resolves {file.size}", () => {
      const context = createContext({ metadata });
      const result = resolveVariable(createToken("file.size"), context);
      expect(result).toBe("2048576");
    });

    it("resolves {file.sizeFormatted}", () => {
      const context = createContext({ metadata });
      const result = resolveVariable(createToken("file.sizeFormatted"), context);
      expect(result).toBe("2.0 MB");
    });

    it("resolves {file.created}", () => {
      const context = createContext({ metadata });
      const result = resolveVariable(createToken("file.created", "YYYY-MM-DD"), context);
      expect(result).toBe("2024-01-15");
    });

    it("resolves {file.modified}", () => {
      const context = createContext({ metadata });
      const result = resolveVariable(createToken("file.modified", "YYYY-MM-DD"), context);
      expect(result).toBe("2024-02-20");
    });

    it("returns empty string for missing metadata", () => {
      const context = createContext({ metadata: undefined });
      const result = resolveVariable(createToken("file.size"), context);
      expect(result).toBe("");
    });
  });

  describe("exif metadata variables", () => {
    const metadata = {
      size: 1000,
      created: new Date(),
      modified: new Date(),
      exif: {
        dateTaken: new Date("2024-01-05T14:30:00"),
        width: 4032,
        height: 3024,
        camera: "iPhone 15 Pro",
        cameraMake: "Apple",
        cameraModel: "iPhone 15 Pro",
      },
    };

    it("resolves {exif.dateTaken}", () => {
      const context = createContext({ metadata });
      const result = resolveVariable(createToken("exif.dateTaken", "YYYY-MM-DD"), context);
      expect(result).toBe("2024-01-05");
    });

    it("resolves {exif.dimensions}", () => {
      const context = createContext({ metadata });
      const result = resolveVariable(createToken("exif.dimensions"), context);
      expect(result).toBe("4032x3024");
    });

    it("resolves {exif.width}", () => {
      const context = createContext({ metadata });
      const result = resolveVariable(createToken("exif.width"), context);
      expect(result).toBe("4032");
    });

    it("resolves {exif.camera}", () => {
      const context = createContext({ metadata });
      const result = resolveVariable(createToken("exif.camera"), context);
      expect(result).toBe("iPhone 15 Pro");
    });

    it("returns empty string for missing exif", () => {
      const context = createContext({ metadata: { ...metadata, exif: undefined } });
      const result = resolveVariable(createToken("exif.dateTaken"), context);
      expect(result).toBe("");
    });
  });

  describe("spotlight metadata variables", () => {
    const metadata = {
      size: 1000,
      created: new Date(),
      modified: new Date(),
      spotlight: {
        duration: 185.5,
        artist: "The Beatles",
        album: "Abbey Road",
        title: "Come Together",
        pixelWidth: 1920,
        pixelHeight: 1080,
        pageCount: 42,
      },
    };

    it("resolves {spotlight.duration}", () => {
      const context = createContext({ metadata });
      const result = resolveVariable(createToken("spotlight.duration"), context);
      expect(result).toBe("186"); // Rounded
    });

    it("resolves {spotlight.artist}", () => {
      const context = createContext({ metadata });
      const result = resolveVariable(createToken("spotlight.artist"), context);
      expect(result).toBe("The Beatles");
    });

    it("resolves {spotlight.album}", () => {
      const context = createContext({ metadata });
      const result = resolveVariable(createToken("spotlight.album"), context);
      expect(result).toBe("Abbey Road");
    });

    it("resolves {spotlight.title}", () => {
      const context = createContext({ metadata });
      const result = resolveVariable(createToken("spotlight.title"), context);
      expect(result).toBe("Come Together");
    });

    it("resolves {spotlight.pixelWidth}", () => {
      const context = createContext({ metadata });
      const result = resolveVariable(createToken("spotlight.pixelWidth"), context);
      expect(result).toBe("1920");
    });

    it("resolves {spotlight.pageCount}", () => {
      const context = createContext({ metadata });
      const result = resolveVariable(createToken("spotlight.pageCount"), context);
      expect(result).toBe("42");
    });

    it("returns empty string for missing spotlight", () => {
      const context = createContext({
        metadata: { ...metadata, spotlight: undefined },
      });
      const result = resolveVariable(createToken("spotlight.artist"), context);
      expect(result).toBe("");
    });
  });
});

describe("requiresMetadata", () => {
  it("returns true for file.* variables", () => {
    expect(requiresMetadata("file.size")).toBe(true);
    expect(requiresMetadata("file.modified")).toBe(true);
  });

  it("returns true for exif.* variables", () => {
    expect(requiresMetadata("exif.dateTaken")).toBe(true);
  });

  it("returns true for spotlight.* variables", () => {
    expect(requiresMetadata("spotlight.duration")).toBe(true);
  });

  it("returns false for basic variables", () => {
    expect(requiresMetadata("original")).toBe(false);
    expect(requiresMetadata("counter")).toBe(false);
    expect(requiresMetadata("date")).toBe(false);
  });
});

describe("requiresExif", () => {
  it("returns true for exif.* variables", () => {
    expect(requiresExif("exif.dateTaken")).toBe(true);
    expect(requiresExif("exif.dimensions")).toBe(true);
  });

  it("returns false for non-exif variables", () => {
    expect(requiresExif("file.size")).toBe(false);
    expect(requiresExif("spotlight.artist")).toBe(false);
  });
});

describe("requiresSpotlight", () => {
  it("returns true for spotlight.* variables", () => {
    expect(requiresSpotlight("spotlight.artist")).toBe(true);
    expect(requiresSpotlight("spotlight.duration")).toBe(true);
  });

  it("returns false for non-spotlight variables", () => {
    expect(requiresSpotlight("exif.dateTaken")).toBe(false);
    expect(requiresSpotlight("file.size")).toBe(false);
  });
});

describe("getRequiredDateSource", () => {
  it("returns exif when exif variables are present", () => {
    expect(getRequiredDateSource(["exif.dateTaken", "original"])).toBe("exif");
    expect(getRequiredDateSource(["exif.dimensions"])).toBe("exif");
  });

  it("returns null when no special date source needed", () => {
    expect(getRequiredDateSource(["original", "counter"])).toBeNull();
    expect(getRequiredDateSource(["date", "time"])).toBeNull();
  });
});
