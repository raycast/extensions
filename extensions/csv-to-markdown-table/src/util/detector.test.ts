import { describe, it, expect } from "vitest";
import { isCsv, isTsv } from "./detector";

describe("isCsv", () => {
  it("returns true for valid CSV data", () => {
    const csv = "name,age,city\nJohn,30,Tokyo\nJane,25,Osaka";
    expect(isCsv(csv)).toBe(true);
  });

  it("returns true for CSV with consistent comma count", () => {
    const csv = "a,b,c\n1,2,3\n4,5,6";
    expect(isCsv(csv)).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isCsv("")).toBe(false);
  });

  it("returns false for whitespace-only string", () => {
    expect(isCsv("   \n  \n  ")).toBe(false);
  });

  it("returns false for TSV data", () => {
    const tsv = "name\tage\tcity\nJohn\t30\tTokyo\nJane\t25\tOsaka";
    expect(isCsv(tsv)).toBe(false);
  });

  it("returns false for data without delimiters", () => {
    const noDelimiter = "name age city\nJohn 30 Tokyo";
    expect(isCsv(noDelimiter)).toBe(false);
  });
});

describe("isTsv", () => {
  it("returns true for valid TSV data", () => {
    const tsv = "name\tage\tcity\nJohn\t30\tTokyo\nJane\t25\tOsaka";
    expect(isTsv(tsv)).toBe(true);
  });

  it("returns true for TSV with consistent tab count", () => {
    const tsv = "a\tb\tc\n1\t2\t3\n4\t5\t6";
    expect(isTsv(tsv)).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isTsv("")).toBe(false);
  });

  it("returns false for whitespace-only string", () => {
    expect(isTsv("   \n  \n  ")).toBe(false);
  });

  it("returns false for CSV data", () => {
    const csv = "name,age,city\nJohn,30,Tokyo\nJane,25,Osaka";
    expect(isTsv(csv)).toBe(false);
  });

  it("returns false for data without delimiters", () => {
    const noDelimiter = "name age city\nJohn 30 Tokyo";
    expect(isTsv(noDelimiter)).toBe(false);
  });
});
