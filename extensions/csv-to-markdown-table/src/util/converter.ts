/**
 * CSV/TSVデータをMarkdownテーブルに変換する
 */
export function convertToMarkdownTable(
  text: string,
  delimiter: "," | "\t",
): string {
  const lines = text.split("\n").filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return "";
  }

  const rows = lines.map((line) => line.split(delimiter));

  // ヘッダー行
  const header = rows[0];
  const headerRow = `| ${header.join(" | ")} |`;

  // セパレーター行
  const separator = `| ${header.map(() => "---").join(" | ")} |`;

  // データ行
  const dataRows = rows.slice(1).map((row) => `| ${row.join(" | ")} |`);

  return [headerRow, separator, ...dataRows].join("\n");
}

/**
 * MarkdownテーブルをCSV/TSVに変換する
 */
export function convertFromMarkdownTable(
  text: string,
  delimiter: "," | "\t",
): string {
  const lines = text.split("\n").filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return "";
  }

  // Markdownテーブルの行をパース
  const rows = lines
    .filter((line) => !line.match(/^\|\s*[-:]+\s*\|/)) // セパレーター行を除外
    .map((line) => {
      // 先頭と末尾の | を除去し、| で分割
      return line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
    });

  // 各行を指定された区切り文字で結合
  return rows.map((row) => row.join(delimiter)).join("\n");
}
