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

  // パイプ文字をエスケープする関数
  const escapePipe = (cell: string): string => cell.replace(/\|/g, "\\|");

  // ヘッダー行
  const header = rows[0];
  const headerRow = `| ${header.map(escapePipe).join(" | ")} |`;

  // セパレーター行
  const separator = `| ${header.map(() => "---").join(" | ")} |`;

  // データ行
  const dataRows = rows
    .slice(1)
    .map((row) => `| ${row.map(escapePipe).join(" | ")} |`);

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

  // プレースホルダーを使用してエスケープされたパイプを保護
  const PIPE_PLACEHOLDER = "\u0000ESCAPED_PIPE\u0000";

  // Markdownテーブルの行をパース
  const rows = lines
    .filter((line) => !line.match(/^\|\s*[-:]+\s*(\|\s*[-:]+\s*)*\|$/)) // セパレーター行を除外
    .map((line) => {
      // エスケープされたパイプを一時的にプレースホルダーに置換
      const processedLine = line.replace(/\\\|/g, PIPE_PLACEHOLDER);

      // 先頭と末尾の | を除去し、| で分割
      const cells = processedLine
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => {
          // プレースホルダーをパイプ文字に戻す
          return cell.trim().replace(new RegExp(PIPE_PLACEHOLDER, "g"), "|");
        });

      return cells;
    });

  // 各行を指定された区切り文字で結合
  return rows.map((row) => row.join(delimiter)).join("\n");
}
