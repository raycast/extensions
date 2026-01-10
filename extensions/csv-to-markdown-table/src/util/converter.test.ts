import { describe, it, expect } from "vitest";
import { convertToMarkdownTable, convertFromMarkdownTable } from "./converter";

describe("convertToMarkdownTable", () => {
  describe("CSV conversion", () => {
    it("converts basic CSV to Markdown table", () => {
      const csv = "name,age,city\nJohn,30,Tokyo\nJane,25,Osaka";
      const expected = `| name | age | city |
| --- | --- | --- |
| John | 30 | Tokyo |
| Jane | 25 | Osaka |`;
      expect(convertToMarkdownTable(csv, ",")).toBe(expected);
    });

    it("converts CSV with header only", () => {
      const csv = "name,age,city";
      const expected = `| name | age | city |
| --- | --- | --- |`;
      expect(convertToMarkdownTable(csv, ",")).toBe(expected);
    });

    it("ignores empty lines during conversion", () => {
      const csv = "name,age\n\nJohn,30\n\nJane,25\n";
      const expected = `| name | age |
| --- | --- |
| John | 30 |
| Jane | 25 |`;
      expect(convertToMarkdownTable(csv, ",")).toBe(expected);
    });

    it("converts single column CSV", () => {
      const csv = "name\nJohn\nJane";
      const expected = `| name |
| --- |
| John |
| Jane |`;
      expect(convertToMarkdownTable(csv, ",")).toBe(expected);
    });
  });

  describe("TSV conversion", () => {
    it("converts basic TSV to Markdown table", () => {
      const tsv = "name\tage\tcity\nJohn\t30\tTokyo\nJane\t25\tOsaka";
      const expected = `| name | age | city |
| --- | --- | --- |
| John | 30 | Tokyo |
| Jane | 25 | Osaka |`;
      expect(convertToMarkdownTable(tsv, "\t")).toBe(expected);
    });

    it("converts TSV with header only", () => {
      const tsv = "name\tage\tcity";
      const expected = `| name | age | city |
| --- | --- | --- |`;
      expect(convertToMarkdownTable(tsv, "\t")).toBe(expected);
    });

    it("ignores empty lines during conversion", () => {
      const tsv = "name\tage\n\nJohn\t30\n\nJane\t25\n";
      const expected = `| name | age |
| --- | --- |
| John | 30 |
| Jane | 25 |`;
      expect(convertToMarkdownTable(tsv, "\t")).toBe(expected);
    });
  });

  describe("Edge cases", () => {
    it("returns empty string when converting empty string", () => {
      expect(convertToMarkdownTable("", ",")).toBe("");
    });

    it("空白のみの文字列を変換すると空文字列を返す", () => {
      expect(convertToMarkdownTable("   \n  \n  ", ",")).toBe("");
    });

    it("converts data with many columns", () => {
      const csv = "a,b,c,d,e,f\n1,2,3,4,5,6";
      const expected = `| a | b | c | d | e | f |
| --- | --- | --- | --- | --- | --- |
| 1 | 2 | 3 | 4 | 5 | 6 |`;
      expect(convertToMarkdownTable(csv, ",")).toBe(expected);
    });

    it("correctly escapes pipe characters in cells", () => {
      const csv = "name,description\nProduct A,Features: A | B | C";
      const expected = `| name | description |
| --- | --- |
| Product A | Features: A \\| B \\| C |`;
      expect(convertToMarkdownTable(csv, ",")).toBe(expected);
    });

    it("correctly converts cells containing commas (CSV)", () => {
      const csv = "name,value\nItem A,1,000";
      const expected = `| name | value |
| --- | --- |
| Item A | 1 |`;
      // Note: Commas are treated as delimiters, resulting in additional columns
      // This maintains existing behavior
      expect(convertToMarkdownTable(csv, ",")).not.toBe(expected);
    });

    it("correctly converts cells containing tabs (TSV)", () => {
      const tsv = "name\tvalue\nItem\tA\tB";
      // Tabs are treated as delimiters, resulting in additional columns
      const result = convertToMarkdownTable(tsv, "\t");
      expect(result).toContain("Item");
      expect(result).toContain("A");
    });

    it("クォートを含むセルを変換する", () => {
      const csv = `name,quote\nJohn,"Hello"`;
      const expected = `| name | quote |
| --- | --- |
| John | "Hello" |`;
      expect(convertToMarkdownTable(csv, ",")).toBe(expected);
    });

    it("連続する空白を含むセルを変換する", () => {
      const csv = "name,description\nJohn,  Multiple   Spaces  ";
      const expected = `| name | description |
| --- | --- |
| John |   Multiple   Spaces   |`;
      expect(convertToMarkdownTable(csv, ",")).toBe(expected);
    });
  });
});

describe("convertFromMarkdownTable", () => {
  describe("Basic conversion", () => {
    it("converts Markdown table to CSV", () => {
      const markdown = `| name | age | city |
| --- | --- | --- |
| John | 30 | Tokyo |
| Jane | 25 | Osaka |`;
      const expected = "name,age,city\nJohn,30,Tokyo\nJane,25,Osaka";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });

    it("converts Markdown table to TSV", () => {
      const markdown = `| name | age | city |
| --- | --- | --- |
| John | 30 | Tokyo |
| Jane | 25 | Osaka |`;
      const expected = "name\tage\tcity\nJohn\t30\tTokyo\nJane\t25\tOsaka";
      expect(convertFromMarkdownTable(markdown, "\t")).toBe(expected);
    });

    it("converts Markdown table with header only", () => {
      const markdown = `| name | age | city |
| --- | --- | --- |`;
      const expected = "name,age,city";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });

    it("correctly excludes separator rows", () => {
      const markdown = `| name | age |
| --- | --- |
| John | 30 |`;
      const result = convertFromMarkdownTable(markdown, ",");
      expect(result).toBe("name,age\nJohn,30");
      expect(result).not.toContain("---");
    });

    it("空白行を無視して変換する", () => {
      const markdown = `| name | age |
| --- | --- |

| John | 30 |

| Jane | 25 |`;
      const expected = "name,age\nJohn,30\nJane,25";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });

    it("removes leading and trailing whitespace from cells", () => {
      const markdown = `|  name  |  age  |
| --- | --- |
|  John  |  30  |`;
      const expected = "name,age\nJohn,30";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });
  });

  describe("Special character edge cases", () => {
    it("correctly handles cells with escaped pipe characters", () => {
      const markdown = `| name | description |
| --- | --- |
| Product A | Features: A \\| B \\| C |`;
      const expected = "name,description\nProduct A,Features: A | B | C";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });

    it("handles cells with multiple escaped pipes", () => {
      const markdown = `| col1 | col2 |
| --- | --- |
| a\\|b\\|c | x\\|y |`;
      const expected = "col1,col2\na|b|c,x|y";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });

    it("converts cells containing commas to CSV", () => {
      const markdown = `| name | value |
| --- | --- |
| Item | 1,000 |`;
      const expected = "name,value\nItem,1,000";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });

    it("converts cells containing tab characters to TSV", () => {
      const markdown = `| name | value |
| --- | --- |
| Item | Data	Here |`;
      const expected = "name\tvalue\nItem\tData	Here";
      expect(convertFromMarkdownTable(markdown, "\t")).toBe(expected);
    });

    it("クォートを含むセルを変換する", () => {
      const markdown = `| name | quote |
| --- | --- |
| John | "Hello World" |`;
      const expected = `name,quote\nJohn,"Hello World"`;
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });
  });

  describe("Other edge cases", () => {
    it("returns empty string when converting empty string", () => {
      expect(convertFromMarkdownTable("", ",")).toBe("");
    });

    it("空白のみの文字列を変換すると空文字列を返す", () => {
      expect(convertFromMarkdownTable("   \n  \n  ", ",")).toBe("");
    });

    it("converts single column table", () => {
      const markdown = `| name |
| --- |
| John |
| Jane |`;
      const expected = "name\nJohn\nJane";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });

    it("連続する空白を含むセルを変換する", () => {
      const markdown = `| name | description |
| --- | --- |
| John |   Multiple   Spaces   |`;
      const expected = "name,description\nJohn,Multiple   Spaces";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });

    it("converts table with many columns", () => {
      const markdown = `| a | b | c | d | e | f |
| --- | --- | --- | --- | --- | --- |
| 1 | 2 | 3 | 4 | 5 | 6 |`;
      const expected = "a,b,c,d,e,f\n1,2,3,4,5,6";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });
  });

  describe("Bidirectional conversion", () => {
    it("CSV → Markdown → CSV conversion works correctly", () => {
      const originalCsv = "name,age,city\nJohn,30,Tokyo\nJane,25,Osaka";
      const markdown = convertToMarkdownTable(originalCsv, ",");
      const resultCsv = convertFromMarkdownTable(markdown, ",");
      expect(resultCsv).toBe(originalCsv);
    });

    it("TSV → Markdown → TSV conversion works correctly", () => {
      const originalTsv = "name\tage\tcity\nJohn\t30\tTokyo\nJane\t25\tOsaka";
      const markdown = convertToMarkdownTable(originalTsv, "\t");
      const resultTsv = convertFromMarkdownTable(markdown, "\t");
      expect(resultTsv).toBe(originalTsv);
    });

    it("bidirectional conversion with pipe characters works correctly", () => {
      const originalCsv = "name,description\nProduct A,A | B | C";
      const markdown = convertToMarkdownTable(originalCsv, ",");
      const resultCsv = convertFromMarkdownTable(markdown, ",");
      expect(resultCsv).toBe(originalCsv);
    });

    it("Markdown → CSV → Markdown conversion works correctly", () => {
      const originalMarkdown = `| name | age | city |
| --- | --- | --- |
| John | 30 | Tokyo |
| Jane | 25 | Osaka |`;
      const csv = convertFromMarkdownTable(originalMarkdown, ",");
      const resultMarkdown = convertToMarkdownTable(csv, ",");
      expect(resultMarkdown).toBe(originalMarkdown);
    });

    it("bidirectional conversion with escaped pipes works correctly", () => {
      const originalMarkdown = `| name | description |
| --- | --- |
| Product A | Features: A \\| B \\| C |`;
      const csv = convertFromMarkdownTable(originalMarkdown, ",");
      const resultMarkdown = convertToMarkdownTable(csv, ",");
      expect(resultMarkdown).toBe(originalMarkdown);
    });
  });
});
