import { describe, it, expect } from "vitest";
import {
  parseTemplate,
  validateTemplate,
  extractVariables,
  hasVariable,
  replaceVariable,
} from "../lib/template/parser";

describe("parseTemplate", () => {
  it("parses simple variable", () => {
    const result = parseTemplate("{original}");
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]).toEqual({
      type: "variable",
      name: "original",
      format: undefined,
      fullMatch: "{original}",
    });
    expect(result.variables).toEqual(["original"]);
  });

  it("parses variable with format", () => {
    const result = parseTemplate("{date:YYYY-MM-DD}");
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]).toEqual({
      type: "variable",
      name: "date",
      format: "YYYY-MM-DD",
      fullMatch: "{date:YYYY-MM-DD}",
    });
  });

  it("parses nested variable (dot notation)", () => {
    const result = parseTemplate("{exif.dateTaken:YYYY-MM-DD}");
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]).toEqual({
      type: "variable",
      name: "exif.dateTaken",
      format: "YYYY-MM-DD",
      fullMatch: "{exif.dateTaken:YYYY-MM-DD}",
    });
    // Base name should be tracked
    expect(result.variables).toEqual(["exif"]);
  });

  it("parses mixed literal and variables", () => {
    const result = parseTemplate("{date:YYYY-MM-DD}_{original}_{counter:001}");
    expect(result.tokens).toHaveLength(5);
    expect(result.tokens[0]).toMatchObject({ type: "variable", name: "date" });
    expect(result.tokens[1]).toMatchObject({ type: "literal", value: "_" });
    expect(result.tokens[2]).toMatchObject({ type: "variable", name: "original" });
    expect(result.tokens[3]).toMatchObject({ type: "literal", value: "_" });
    expect(result.tokens[4]).toMatchObject({ type: "variable", name: "counter" });
  });

  it("parses literal-only template", () => {
    const result = parseTemplate("static_name");
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]).toEqual({ type: "literal", value: "static_name" });
    expect(result.variables).toEqual([]);
  });

  it("parses template with leading literal", () => {
    const result = parseTemplate("prefix_{original}");
    expect(result.tokens).toHaveLength(2);
    expect(result.tokens[0]).toEqual({ type: "literal", value: "prefix_" });
    expect(result.tokens[1]).toMatchObject({ type: "variable", name: "original" });
  });

  it("parses template with trailing literal", () => {
    const result = parseTemplate("{original}_suffix");
    expect(result.tokens).toHaveLength(2);
    expect(result.tokens[0]).toMatchObject({ type: "variable", name: "original" });
    expect(result.tokens[1]).toEqual({ type: "literal", value: "_suffix" });
  });

  it("handles empty template", () => {
    const result = parseTemplate("");
    expect(result.tokens).toHaveLength(0);
    expect(result.variables).toEqual([]);
  });

  it("tracks unique variables only", () => {
    const result = parseTemplate("{date}_{date}_{original}");
    expect(result.variables).toEqual(["date", "original"]);
  });

  it("preserves raw template", () => {
    const template = "{date:YYYY-MM-DD}_{original}";
    const result = parseTemplate(template);
    expect(result.raw).toBe(template);
  });

  it("parses counter with zero padding", () => {
    const result = parseTemplate("{counter:0001}");
    expect(result.tokens[0]).toMatchObject({
      type: "variable",
      name: "counter",
      format: "0001",
    });
  });

  it("parses file metadata variables", () => {
    const result = parseTemplate("{file.size}_{file.modified:YYYY-MM-DD}");
    expect(result.tokens[0]).toMatchObject({
      type: "variable",
      name: "file.size",
    });
    expect(result.tokens[2]).toMatchObject({
      type: "variable",
      name: "file.modified",
      format: "YYYY-MM-DD",
    });
  });

  it("parses spotlight metadata variables", () => {
    const result = parseTemplate("{spotlight.artist}_{spotlight.duration}");
    expect(result.tokens[0]).toMatchObject({
      type: "variable",
      name: "spotlight.artist",
    });
  });
});

describe("validateTemplate", () => {
  it("validates correct template", () => {
    const result = validateTemplate("{date:YYYY-MM-DD}_{original}");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects empty template", () => {
    const result = validateTemplate("");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("rejects whitespace-only template", () => {
    const result = validateTemplate("   ");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("rejects unbalanced braces", () => {
    const result = validateTemplate("{date_{original}");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unbalanced braces");
  });

  it("rejects empty variable placeholder", () => {
    const result = validateTemplate("prefix_{}");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Empty variable");
  });

  it("rejects invalid variable name", () => {
    const result = validateTemplate("{123invalid}");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid variable name");
  });

  it("warns about unknown variables", () => {
    const result = validateTemplate("{unknownVar}");
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings).toContain("Unknown variable: {unknownVar}");
  });

  it("allows known variables without warning", () => {
    const result = validateTemplate("{original}_{date}_{counter}");
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeUndefined();
  });
});

describe("extractVariables", () => {
  it("extracts all variable names", () => {
    const vars = extractVariables("{date:YYYY-MM-DD}_{original}_{counter:001}");
    expect(vars).toEqual(["date", "original", "counter"]);
  });

  it("returns empty array for literal-only template", () => {
    const vars = extractVariables("static_name");
    expect(vars).toEqual([]);
  });

  it("extracts nested variable names", () => {
    const vars = extractVariables("{exif.dateTaken}_{file.size}");
    expect(vars).toEqual(["exif.dateTaken", "file.size"]);
  });
});

describe("hasVariable", () => {
  it("returns true for exact match", () => {
    expect(hasVariable("{original}_{date}", "original")).toBe(true);
    expect(hasVariable("{original}_{date}", "date")).toBe(true);
  });

  it("returns false for non-existent variable", () => {
    expect(hasVariable("{original}", "date")).toBe(false);
  });

  it("matches nested variables by prefix", () => {
    expect(hasVariable("{exif.dateTaken}", "exif")).toBe(true);
    expect(hasVariable("{exif.dateTaken}", "exif.dateTaken")).toBe(true);
  });
});

describe("replaceVariable", () => {
  it("replaces variable with new value", () => {
    const result = replaceVariable("{original}_{date}", "original", "newname");
    expect(result).toBe("newname_{date}");
  });

  it("replaces variable with format", () => {
    const result = replaceVariable("{date:YYYY-MM-DD}", "date", "2024-01-15");
    expect(result).toBe("2024-01-15");
  });

  it("replaces all occurrences", () => {
    const result = replaceVariable("{date}_{date}", "date", "TODAY");
    expect(result).toBe("TODAY_TODAY");
  });

  it("does not replace partial matches", () => {
    const result = replaceVariable("{original}_{originalCopy}", "original", "X");
    expect(result).toBe("X_{originalCopy}");
  });
});
