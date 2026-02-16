import { describe, it, expect } from "vitest";
import {
  TEMPLATE_VARIABLES,
  KNOWN_VARIABLE_PREFIXES,
  isKnownVariable,
  getVariableDescription,
  getVariableMarkdown,
} from "../lib/template/variable-registry";

describe("TEMPLATE_VARIABLES", () => {
  it("is a non-empty array", () => {
    expect(TEMPLATE_VARIABLES.length).toBeGreaterThan(0);
  });

  it("each variable has required fields", () => {
    for (const v of TEMPLATE_VARIABLES) {
      expect(v.name).toBeTruthy();
      expect(v.description).toBeTruthy();
      expect(v.example).toBeTruthy();
      expect(typeof v.requiresMetadata).toBe("boolean");
      expect(typeof v.requiresExif).toBe("boolean");
      expect(typeof v.requiresSpotlight).toBe("boolean");
    }
  });

  it("includes basic variables (original, counter, extension)", () => {
    const names = TEMPLATE_VARIABLES.map((v) => v.name);
    expect(names).toContain("original");
    expect(names).toContain("counter");
    expect(names).toContain("extension");
  });

  it("includes EXIF variables", () => {
    const names = TEMPLATE_VARIABLES.map((v) => v.name);
    expect(names).toContain("exif.dateTaken");
    expect(names).toContain("exif.dimensions");
    expect(names).toContain("exif.camera");
  });

  it("includes Spotlight variables", () => {
    const names = TEMPLATE_VARIABLES.map((v) => v.name);
    expect(names).toContain("spotlight.artist");
    expect(names).toContain("spotlight.album");
  });

  it("EXIF variables require metadata and exif", () => {
    const exifVars = TEMPLATE_VARIABLES.filter((v) => v.name.startsWith("exif."));
    for (const v of exifVars) {
      expect(v.requiresMetadata).toBe(true);
      expect(v.requiresExif).toBe(true);
    }
  });

  it("Spotlight variables require metadata and spotlight", () => {
    const spotlightVars = TEMPLATE_VARIABLES.filter((v) => v.name.startsWith("spotlight."));
    for (const v of spotlightVars) {
      expect(v.requiresMetadata).toBe(true);
      expect(v.requiresSpotlight).toBe(true);
    }
  });

  it("basic variables do not require metadata", () => {
    const basicVars = TEMPLATE_VARIABLES.filter((v) => ["original", "counter", "extension"].includes(v.name));
    for (const v of basicVars) {
      expect(v.requiresMetadata).toBe(false);
    }
  });
});

describe("KNOWN_VARIABLE_PREFIXES", () => {
  it("is a non-empty array of unique prefixes", () => {
    expect(KNOWN_VARIABLE_PREFIXES.length).toBeGreaterThan(0);
    const uniqueSet = new Set(KNOWN_VARIABLE_PREFIXES);
    expect(uniqueSet.size).toBe(KNOWN_VARIABLE_PREFIXES.length);
  });

  it("includes base prefixes like original, counter, date, exif, spotlight, file", () => {
    expect(KNOWN_VARIABLE_PREFIXES).toContain("original");
    expect(KNOWN_VARIABLE_PREFIXES).toContain("counter");
    expect(KNOWN_VARIABLE_PREFIXES).toContain("date");
    expect(KNOWN_VARIABLE_PREFIXES).toContain("exif");
    expect(KNOWN_VARIABLE_PREFIXES).toContain("spotlight");
    expect(KNOWN_VARIABLE_PREFIXES).toContain("file");
  });
});

describe("isKnownVariable", () => {
  it("returns true for known variable names", () => {
    expect(isKnownVariable("original")).toBe(true);
    expect(isKnownVariable("counter")).toBe(true);
    expect(isKnownVariable("date")).toBe(true);
  });

  it("returns true for dotted variable names (prefix match)", () => {
    expect(isKnownVariable("exif.dateTaken")).toBe(true);
    expect(isKnownVariable("spotlight.artist")).toBe(true);
    expect(isKnownVariable("file.size")).toBe(true);
  });

  it("returns false for unknown variable names", () => {
    expect(isKnownVariable("foobar")).toBe(false);
    expect(isKnownVariable("unknown.field")).toBe(false);
  });
});

describe("getVariableDescription", () => {
  it("returns description for known variable", () => {
    const desc = getVariableDescription("original");
    expect(desc).toBe("Original filename (no extension)");
  });

  it("returns description for dotted variable", () => {
    const desc = getVariableDescription("exif.dateTaken");
    expect(desc).toBe("Photo date taken");
  });

  it("returns undefined for unknown variable", () => {
    expect(getVariableDescription("nonexistent")).toBeUndefined();
  });
});

describe("getVariableMarkdown", () => {
  it("returns a non-empty markdown string", () => {
    const md = getVariableMarkdown();
    expect(md.length).toBeGreaterThan(0);
  });

  it("includes backtick-wrapped examples", () => {
    const md = getVariableMarkdown();
    expect(md).toContain("`{original}`");
    expect(md).toContain("`{counter:001}`");
  });

  it("includes descriptions", () => {
    const md = getVariableMarkdown();
    expect(md).toContain("Original filename (no extension)");
    expect(md).toContain("Sequential number");
  });

  it("has one line per variable", () => {
    const md = getVariableMarkdown();
    const lines = md.trim().split("\n");
    expect(lines.length).toBe(TEMPLATE_VARIABLES.length);
  });
});
