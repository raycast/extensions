// Replaces all Unicode whitespace sequences (except newlines) with a single space
function collapseAllSpaces(input: string): string {
  return input
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/gu, " ").trim())
    .join("\n");
}

function cleanLLMText(input: string): string {
  return input
    .replace(
      /([^\n])\n(?!\s*([-*•●⏺▶▪◦]|\d+\.|[A-Z][a-z]|\p{Extended_Pictographic}|$))/gu,
      "$1 ",
    )
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanGitDiff(input: string): string {
  return input
    .replace(/[│┃╏╎|▌]+/g, "")
    .replace(
      /([^\n])\n(?!\s*(\d+\s*[+-]\s*|[-*•●⏺▶▪◦]|\d+\.|[A-Z][a-z]|\p{Extended_Pictographic}|^\s*$|$))/gu,
      "$1 ",
    )
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function cleanClaudeDump(input: string): string {
  return input
    .replace(/[│┃╏╎|▌]+/g, "")
    .replace(/ {2,}/g, " ")
    .replace(
      /([^\n])\n(?!\s*([-*•●⏺▶▪◦]|\d+\.|[A-Z][a-z]|\p{Extended_Pictographic}|$))/gu,
      "$1 ",
    )
    .replace(/([a-z,:])\s*\n\s*([a-z])/g, "$1 $2")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface CleanOptions {
  collapseSpaces?: boolean;
}

export function detectAndClean(
  input: string,
  options: CleanOptions = {},
): string {
  if (!input.trim()) return "";

  // Apply aggressive space collapsing before other cleaning if requested
  const normalized = options.collapseSpaces ? collapseAllSpaces(input) : input;

  if (/^\s*\d+\s*[+-]\s/m.test(normalized)) {
    return cleanGitDiff(normalized);
  }

  if (/[│┃╏╎▌]/.test(normalized) || /\|/.test(normalized)) {
    return cleanClaudeDump(normalized);
  }

  const codeScore = (normalized.match(/[{}();=]/g) || []).length;
  const lineCount = normalized.split("\n").length;
  if (lineCount > 0 && codeScore / lineCount > 0.5) {
    return normalized.trim();
  }

  return cleanLLMText(normalized);
}
