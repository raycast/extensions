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

export function detectAndClean(input: string): string {
  if (!input.trim()) return "";

  if (/^\s*\d+\s*[+-]\s/m.test(input)) {
    return cleanGitDiff(input);
  }

  if (/[│┃╏╎▌]/.test(input) || /\|/.test(input)) {
    return cleanClaudeDump(input);
  }

  const codeScore = (input.match(/[{}();=]/g) || []).length;
  const lineCount = input.split("\n").length;
  if (lineCount > 0 && codeScore / lineCount > 0.5) {
    return input.trim();
  }

  return cleanLLMText(input);
}
