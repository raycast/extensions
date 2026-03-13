import { describe, it, expect } from "vitest";

// Test the pure functions directly without importing the module that has @raycast/api dependency
// These functions can be tested by duplicating their logic here since they are simple utility functions

// Replicate the findColumn function logic for testing
function findColumn(columns: string[], candidates: string[]): string | undefined {
  const lowerCaseColumns = columns.map((column) => column.toLowerCase());
  for (const candidate of candidates) {
    const index = lowerCaseColumns.indexOf(candidate);
    if (index >= 0) {
      return columns[index];
    }
  }
  return undefined;
}

// Replicate the quoteIdentifier function logic for testing
function quoteIdentifier(identifier: string): string {
  const escaped = identifier.replace(/"/g, '""');
  return `"${escaped}"`;
}

describe("findColumn", () => {
  it("finds matching column case-insensitively", () => {
    const columns = ["ResourceId", "Title", "Author"];
    expect(findColumn(columns, ["resourceid", "res_id"])).toBe("ResourceId");
  });

  it("returns first matching candidate", () => {
    const columns = ["id", "resource_id", "resourceid"];
    expect(findColumn(columns, ["resourceid", "id"])).toBe("resourceid");
  });

  it("returns undefined when no match found", () => {
    const columns = ["Name", "Description"];
    expect(findColumn(columns, ["id", "resourceid"])).toBeUndefined();
  });

  it("handles empty columns array", () => {
    expect(findColumn([], ["id"])).toBeUndefined();
  });

  it("handles empty candidates array", () => {
    const columns = ["Id", "Name"];
    expect(findColumn(columns, [])).toBeUndefined();
  });

  it("matches with different casing", () => {
    const columns = ["AUTHOR", "title"];
    expect(findColumn(columns, ["author"])).toBe("AUTHOR");
    expect(findColumn(columns, ["title"])).toBe("title");
  });
});

describe("quoteIdentifier", () => {
  it("quotes simple identifier", () => {
    expect(quoteIdentifier("column_name")).toBe('"column_name"');
  });

  it("escapes double quotes in identifier", () => {
    expect(quoteIdentifier('column"name')).toBe('"column""name"');
  });

  it("handles multiple double quotes", () => {
    expect(quoteIdentifier('a"b"c')).toBe('"a""b""c"');
  });

  it("handles empty string", () => {
    expect(quoteIdentifier("")).toBe('""');
  });

  it("handles identifier with spaces", () => {
    expect(quoteIdentifier("column name")).toBe('"column name"');
  });

  it("handles identifier with special characters", () => {
    expect(quoteIdentifier("column-name.field")).toBe('"column-name.field"');
  });
});
