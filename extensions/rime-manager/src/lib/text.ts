export function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

export function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}

export function yamlString(value: string): string {
  return JSON.stringify(value);
}

export function cleanCandidateText(value: string): string {
  return value.replace(/[\t\r\n]+/g, " ").trim();
}

export function cleanCode(value: string): string {
  return value
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitCandidates(value: string): string[] {
  const delimiter = value.includes(",") || value.includes("，") ? /[,，]/ : /\s+/;
  return [...new Set(value.split(delimiter).map(cleanCandidateText).filter(Boolean))];
}
