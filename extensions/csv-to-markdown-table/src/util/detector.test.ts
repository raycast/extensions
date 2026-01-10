import { describe, it, expect } from "vitest";
import { isCsv, isTsv } from "./detector";

describe("isCsv", () => {
  it("有効なCSVデータに対してtrueを返す", () => {
    const csv = "name,age,city\nJohn,30,Tokyo\nJane,25,Osaka";
    expect(isCsv(csv)).toBe(true);
  });

  it("一貫したカンマ数のCSVに対してtrueを返す", () => {
    const csv = "a,b,c\n1,2,3\n4,5,6";
    expect(isCsv(csv)).toBe(true);
  });

  it("空文字列に対してfalseを返す", () => {
    expect(isCsv("")).toBe(false);
  });

  it("空白のみの文字列に対してfalseを返す", () => {
    expect(isCsv("   \n  \n  ")).toBe(false);
  });

  it("TSVデータに対してfalseを返す", () => {
    const tsv = "name\tage\tcity\nJohn\t30\tTokyo\nJane\t25\tOsaka";
    expect(isCsv(tsv)).toBe(false);
  });

  it("区切り文字がないデータに対してfalseを返す", () => {
    const noDelimiter = "name age city\nJohn 30 Tokyo";
    expect(isCsv(noDelimiter)).toBe(false);
  });
});

describe("isTsv", () => {
  it("有効なTSVデータに対してtrueを返す", () => {
    const tsv = "name\tage\tcity\nJohn\t30\tTokyo\nJane\t25\tOsaka";
    expect(isTsv(tsv)).toBe(true);
  });

  it("一貫したタブ数のTSVに対してtrueを返す", () => {
    const tsv = "a\tb\tc\n1\t2\t3\n4\t5\t6";
    expect(isTsv(tsv)).toBe(true);
  });

  it("空文字列に対してfalseを返す", () => {
    expect(isTsv("")).toBe(false);
  });

  it("空白のみの文字列に対してfalseを返す", () => {
    expect(isTsv("   \n  \n  ")).toBe(false);
  });

  it("CSVデータに対してfalseを返す", () => {
    const csv = "name,age,city\nJohn,30,Tokyo\nJane,25,Osaka";
    expect(isTsv(csv)).toBe(false);
  });

  it("区切り文字がないデータに対してfalseを返す", () => {
    const noDelimiter = "name age city\nJohn 30 Tokyo";
    expect(isTsv(noDelimiter)).toBe(false);
  });
});
