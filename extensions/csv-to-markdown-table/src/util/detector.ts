/**
 * Check if the string is in Markdown table format
 */
export function isMarkdownTable(text: string): boolean {
  if (!text || text.trim() === "") {
    return false;
  }

  const lines = text.split("\n").filter((line) => line.trim() !== "");
  if (lines.length < 2) {
    return false;
  }

  const hasTableFormat = lines.every(
    (line) => line.trim().startsWith("|") && line.trim().endsWith("|"),
  );
  if (!hasTableFormat) {
    return false;
  }

  const hasSeparator = lines.some((line) =>
    line.match(/^\|\s*[-:]+\s*(\|\s*[-:]+\s*)*\|$/),
  );

  return hasSeparator;
}

export function isCsv(text: string): boolean {
  if (!text || text.trim() === "") {
    return false;
  }

  const lines = text.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return false;
  }

  const commaCount = lines.map((line) => (line.match(/,/g) || []).length);
  const tabCount = lines.map((line) => (line.match(/\t/g) || []).length);

  const avgCommas = commaCount.reduce((a, b) => a + b, 0) / lines.length;
  const avgTabs = tabCount.reduce((a, b) => a + b, 0) / lines.length;

  const commaConsistent = commaCount.every((c) => c === commaCount[0] && c > 0);

  if (commaConsistent) {
    return true;
  }

  return avgCommas > avgTabs && avgCommas > 0;
}

/**
 * Check if the string is in TSV format
 */
export function isTsv(text: string): boolean {
  if (!text || text.trim() === "") {
    return false;
  }

  const lines = text.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return false;
  }

  const commaCount = lines.map((line) => (line.match(/,/g) || []).length);
  const tabCount = lines.map((line) => (line.match(/\t/g) || []).length);

  const avgCommas = commaCount.reduce((a, b) => a + b, 0) / lines.length;
  const avgTabs = tabCount.reduce((a, b) => a + b, 0) / lines.length;

  const tabConsistent = tabCount.every((t) => t === tabCount[0] && t > 0);
  if (tabConsistent) {
    return true;
  }

  return avgTabs > avgCommas && avgTabs > 0;
}
