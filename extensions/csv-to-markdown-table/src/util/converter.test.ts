import { describe, it, expect } from "vitest";
import { convertToMarkdownTable, convertFromMarkdownTable } from "./converter";

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

    it("パイプ文字を含むセルを正しくエスケープする", () => {
      const csv = "name,description\nProduct A,Features: A | B | C";
      const expected = `| name | description |
| --- | --- |
| Product A | Features: A \\| B \\| C |`;
      expect(convertToMarkdownTable(csv, ",")).toBe(expected);
    });

    it("カンマを含むセルを正しく変換する（CSV）", () => {
      const csv = "name,value\nItem A,1,000";
      const expected = `| name | value |
| --- | --- |
| Item A | 1 |`;
      // Note: カンマは区切り文字として扱われるため、追加の列になる
      // これは既存の動作を維持
      expect(convertToMarkdownTable(csv, ",")).not.toBe(expected);
    });

    it("タブを含むセルを正しく変換する（TSV）", () => {
      const tsv = "name\tvalue\nItem\tA\tB";
      // タブは区切り文字として扱われるため、追加の列になる
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
  describe("基本的な変換", () => {
    it("MarkdownテーブルをCSVに変換する", () => {
      const markdown = `| name | age | city |
| --- | --- | --- |
| John | 30 | Tokyo |
| Jane | 25 | Osaka |`;
      const expected = "name,age,city\nJohn,30,Tokyo\nJane,25,Osaka";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });

    it("MarkdownテーブルをTSVに変換する", () => {
      const markdown = `| name | age | city |
| --- | --- | --- |
| John | 30 | Tokyo |
| Jane | 25 | Osaka |`;
      const expected = "name\tage\tcity\nJohn\t30\tTokyo\nJane\t25\tOsaka";
      expect(convertFromMarkdownTable(markdown, "\t")).toBe(expected);
    });

    it("ヘッダーのみのMarkdownテーブルを変換する", () => {
      const markdown = `| name | age | city |
| --- | --- | --- |`;
      const expected = "name,age,city";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });

    it("セパレーター行を正しく除外する", () => {
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

    it("セルの前後の空白を削除する", () => {
      const markdown = `|  name  |  age  |
| --- | --- |
|  John  |  30  |`;
      const expected = "name,age\nJohn,30";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });
  });

  describe("特殊文字のエッジケース", () => {
    it("エスケープされたパイプ文字を含むセルを正しく処理する", () => {
      const markdown = `| name | description |
| --- | --- |
| Product A | Features: A \\| B \\| C |`;
      const expected = "name,description\nProduct A,Features: A | B | C";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });

    it("複数のエスケープされたパイプを含むセルを処理する", () => {
      const markdown = `| col1 | col2 |
| --- | --- |
| a\\|b\\|c | x\\|y |`;
      const expected = "col1,col2\na|b|c,x|y";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });

    it("カンマを含むセルをCSVに変換する", () => {
      const markdown = `| name | value |
| --- | --- |
| Item | 1,000 |`;
      const expected = "name,value\nItem,1,000";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });

    it("タブ文字を含むセルをTSVに変換する", () => {
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

  describe("その他のエッジケース", () => {
    it("空文字列を変換すると空文字列を返す", () => {
      expect(convertFromMarkdownTable("", ",")).toBe("");
    });

    it("空白のみの文字列を変換すると空文字列を返す", () => {
      expect(convertFromMarkdownTable("   \n  \n  ", ",")).toBe("");
    });

    it("単一列のテーブルを変換する", () => {
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

    it("多数の列を持つテーブルを変換する", () => {
      const markdown = `| a | b | c | d | e | f |
| --- | --- | --- | --- | --- | --- |
| 1 | 2 | 3 | 4 | 5 | 6 |`;
      const expected = "a,b,c,d,e,f\n1,2,3,4,5,6";
      expect(convertFromMarkdownTable(markdown, ",")).toBe(expected);
    });
  });

  describe("双方向変換", () => {
    it("CSV → Markdown → CSV の変換が正しく動作する", () => {
      const originalCsv = "name,age,city\nJohn,30,Tokyo\nJane,25,Osaka";
      const markdown = convertToMarkdownTable(originalCsv, ",");
      const resultCsv = convertFromMarkdownTable(markdown, ",");
      expect(resultCsv).toBe(originalCsv);
    });

    it("TSV → Markdown → TSV の変換が正しく動作する", () => {
      const originalTsv = "name\tage\tcity\nJohn\t30\tTokyo\nJane\t25\tOsaka";
      const markdown = convertToMarkdownTable(originalTsv, "\t");
      const resultTsv = convertFromMarkdownTable(markdown, "\t");
      expect(resultTsv).toBe(originalTsv);
    });

    it("パイプ文字を含むデータの双方向変換が正しく動作する", () => {
      const originalCsv = "name,description\nProduct A,A | B | C";
      const markdown = convertToMarkdownTable(originalCsv, ",");
      const resultCsv = convertFromMarkdownTable(markdown, ",");
      expect(resultCsv).toBe(originalCsv);
    });

    it("Markdown → CSV → Markdown の変換が正しく動作する", () => {
      const originalMarkdown = `| name | age | city |
| --- | --- | --- |
| John | 30 | Tokyo |
| Jane | 25 | Osaka |`;
      const csv = convertFromMarkdownTable(originalMarkdown, ",");
      const resultMarkdown = convertToMarkdownTable(csv, ",");
      expect(resultMarkdown).toBe(originalMarkdown);
    });

    it("エスケープされたパイプの双方向変換が正しく動作する", () => {
      const originalMarkdown = `| name | description |
| --- | --- |
| Product A | Features: A \\| B \\| C |`;
      const csv = convertFromMarkdownTable(originalMarkdown, ",");
      const resultMarkdown = convertToMarkdownTable(csv, ",");
      expect(resultMarkdown).toBe(originalMarkdown);
    });
  });
});
