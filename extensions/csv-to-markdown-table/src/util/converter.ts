/**
 * Convert CSV/TSV data to Markdown table format
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

  const escapePipe = (cell: string): string => cell.replace(/\|/g, "\\|");

  const header = rows[0];
  const headerRow = `| ${header.map(escapePipe).join(" | ")} |`;

  const separator = `| ${header.map(() => "---").join(" | ")} |`;

  const dataRows = rows
    .slice(1)
    .map((row) => `| ${row.map(escapePipe).join(" | ")} |`);

  return [headerRow, separator, ...dataRows].join("\n");
}

/**
 * Convert Markdown table to CSV/TSV format
 */
export function convertFromMarkdownTable(
  text: string,
  delimiter: "," | "\t",
): string {
  const lines = text.split("\n").filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return "";
  }

  const PIPE_PLACEHOLDER = "\u0000ESCAPED_PIPE\u0000";

  const rows = lines
    .filter((line) => !line.match(/^\|\s*[-:]+\s*(\|\s*[-:]+\s*)*\|$/))
    .map((line) => {
      const processedLine = line.replace(/\\\|/g, PIPE_PLACEHOLDER);

      const cells = processedLine
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => {
          return cell.trim().replace(new RegExp(PIPE_PLACEHOLDER, "g"), "|");
        });

      return cells;
    });

  return rows.map((row) => row.join(delimiter)).join("\n");
}
