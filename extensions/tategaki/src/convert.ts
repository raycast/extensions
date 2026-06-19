function segmentGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

function isHalfWidth(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x20 && code <= 0x7e;
}

export function convertToVertical(input: string, separator: string): string {
  if (!input) return "";

  const lines = input.split("\n");
  const columns: string[][] = lines.map((line) => segmentGraphemes(line));

  const maxHeight = Math.max(...columns.map((col) => col.length));

  if (maxHeight === 0) return "";

  const result: string[] = [];

  for (let row = 0; row < maxHeight; row++) {
    const rowChars: string[] = [];

    for (let colIndex = columns.length - 1; colIndex >= 0; colIndex--) {
      const column = columns[colIndex];

      if (row < column.length) {
        const char = column[row];
        if (isHalfWidth(char)) {
          rowChars.push(char + " ");
        } else {
          rowChars.push(char);
        }
      } else {
        rowChars.push("  ");
      }
    }

    result.push(rowChars.join(separator));
  }

  return result.join("\n");
}

export function trimInput(text: string): string {
  const lines = text.split("\n");

  let start = 0;
  while (start < lines.length && lines[start].trim() === "") {
    start++;
  }

  let end = lines.length - 1;
  while (end >= start && lines[end].trim() === "") {
    end--;
  }

  if (start > end) return "";

  return lines.slice(start, end + 1).join("\n");
}
