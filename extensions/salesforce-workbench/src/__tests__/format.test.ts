import { describe, expect, it } from "vitest";
import {
  csvEscape,
  escapeSoslTerm,
  flattenRecord,
  parseJsonFromOutput,
  recordsToCsv,
  sanitizeFileName,
} from "../format";

describe("CLI JSON parsing", () => {
  it("parses JSON after warning text", () => {
    expect(parseJsonFromOutput<{ status: number }>('update available\n{"status":0}\n')).toEqual({ status: 0 });
  });

  it("rejects malformed or missing JSON", () => {
    expect(() => parseJsonFromOutput("warning only")).toThrow("no JSON");
    expect(() => parseJsonFromOutput("prefix {bad} suffix")).toThrow("Unable to parse");
  });
});

describe("record formatting", () => {
  it("flattens relationship fields and omits attributes", () => {
    expect(
      flattenRecord({
        Id: "001000000000001AAA",
        Name: "Acme",
        Account: { Name: "Parent" },
        attributes: { type: "Account" },
      }),
    ).toEqual({ Id: "001000000000001AAA", Name: "Acme", "Account.Name": "Parent" });
  });

  it("escapes CSV cells and produces stable headers", () => {
    expect(csvEscape('Hello, "world"')).toBe('"Hello, ""world"""');
    expect(
      recordsToCsv([
        { Id: "1", Name: "Acme" },
        { Id: "2", Name: "Two, Inc." },
      ]),
    ).toBe('Id,Name\n1,Acme\n2,"Two, Inc."');
  });
});

describe("input escaping", () => {
  it("escapes SOSL reserved characters", () => {
    expect(escapeSoslTerm("Acme + (West)?")).toBe("Acme \\+ \\(West\\)\\?");
  });

  it("sanitizes export file names", () => {
    expect(sanitizeFileName("Prod Read/Write: Query.csv")).toBe("Prod-Read-Write-Query.csv");
  });
});
