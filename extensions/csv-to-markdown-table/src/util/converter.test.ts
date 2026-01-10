import { describe, it, expect } from "vitest";
import { convertToMarkdownTable } from "./converter";

describe("convertToMarkdownTable", () => {
  describe("CSV変換", () => {
    it("基本的なCSVをMarkdownテーブルに変換する", () => {
      const csv = "name,age,city\nJohn,30,Tokyo\nJane,25,Osaka";
      const expected = `| name | age | city |
| --- | --- | --- |
| John | 30 | Tokyo |
| Jane | 25 | Osaka |`;
      expect(convertToMarkdownTable(csv, ",")).toBe(expected);
    });

    it("ヘッダーのみのCSVを変換する", () => {
      const csv = "name,age,city";
      const expected = `| name | age | city |
| --- | --- | --- |`;
      expect(convertToMarkdownTable(csv, ",")).toBe(expected);
    });

    it("空白行を無視して変換する", () => {
      const csv = "name,age\n\nJohn,30\n\nJane,25\n";
      const expected = `| name | age |
| --- | --- |
| John | 30 |
| Jane | 25 |`;
      expect(convertToMarkdownTable(csv, ",")).toBe(expected);
    });

    it("単一列のCSVを変換する", () => {
      const csv = "name\nJohn\nJane";
      const expected = `| name |
| --- |
| John |
| Jane |`;
      expect(convertToMarkdownTable(csv, ",")).toBe(expected);
    });
  });

  describe("TSV変換", () => {
    it("基本的なTSVをMarkdownテーブルに変換する", () => {
      const tsv = "name\tage\tcity\nJohn\t30\tTokyo\nJane\t25\tOsaka";
      const expected = `| name | age | city |
| --- | --- | --- |
| John | 30 | Tokyo |
| Jane | 25 | Osaka |`;
      expect(convertToMarkdownTable(tsv, "\t")).toBe(expected);
    });

    it("ヘッダーのみのTSVを変換する", () => {
      const tsv = "name\tage\tcity";
      const expected = `| name | age | city |
| --- | --- | --- |`;
      expect(convertToMarkdownTable(tsv, "\t")).toBe(expected);
    });

    it("空白行を無視して変換する", () => {
      const tsv = "name\tage\n\nJohn\t30\n\nJane\t25\n";
      const expected = `| name | age |
| --- | --- |
| John | 30 |
| Jane | 25 |`;
      expect(convertToMarkdownTable(tsv, "\t")).toBe(expected);
    });
  });

  describe("エッジケース", () => {
    it("空文字列を変換すると空文字列を返す", () => {
      expect(convertToMarkdownTable("", ",")).toBe("");
    });

    it("空白のみの文字列を変換すると空文字列を返す", () => {
      expect(convertToMarkdownTable("   \n  \n  ", ",")).toBe("");
    });

    it("多数の列を持つデータを変換する", () => {
      const csv = "a,b,c,d,e,f\n1,2,3,4,5,6";
      const expected = `| a | b | c | d | e | f |
| --- | --- | --- | --- | --- | --- |
| 1 | 2 | 3 | 4 | 5 | 6 |`;
      expect(convertToMarkdownTable(csv, ",")).toBe(expected);
    });
  });
});
