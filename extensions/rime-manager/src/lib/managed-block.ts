import { ensureTrailingNewline, normalizeLineEndings } from "./text";

export function replaceManagedBlock(source: string, start: string, end: string, block: string | undefined): string {
  const normalized = normalizeLineEndings(source);
  const startIndex = normalized.indexOf(start);
  const endIndex = normalized.indexOf(end);

  let withoutExisting = normalized;
  if (startIndex >= 0 && endIndex > startIndex) {
    const afterEnd = endIndex + end.length;
    const suffixStart = normalized[afterEnd] === "\n" ? afterEnd + 1 : afterEnd;
    withoutExisting = `${normalized.slice(0, startIndex)}${normalized.slice(suffixStart)}`;
  }

  const trimmed = withoutExisting.replace(/\s+$/, "");
  if (!block) return ensureTrailingNewline(trimmed);

  return `${trimmed}\n${block.trimEnd()}\n`;
}

export function insertBlockUnderPatch(source: string, block: string): string {
  const normalized = ensureTrailingNewline(normalizeLineEndings(source || "patch:\n"));
  const lines = normalized.split("\n");
  const patchIndex = lines.findIndex((line) => /^patch:\s*(?:#.*)?$/.test(line));
  if (patchIndex < 0) {
    throw new Error("No top-level patch: key was found. No changes were made.");
  }

  lines.splice(patchIndex + 1, 0, ...block.trimEnd().split("\n"));
  return ensureTrailingNewline(lines.join("\n").replace(/\n+$/, ""));
}

export function replaceManagedPatchBlock(
  source: string,
  start: string,
  end: string,
  patchLines: string[] | undefined,
): string {
  const normalized = normalizeLineEndings(source || "patch:\n");
  const startIndex = normalized.indexOf(start);
  const endIndex = normalized.indexOf(end);
  let withoutExisting = normalized;

  if (startIndex >= 0 && endIndex > startIndex) {
    const afterEnd = endIndex + end.length;
    const suffixStart = normalized[afterEnd] === "\n" ? afterEnd + 1 : afterEnd;
    withoutExisting = `${normalized.slice(0, startIndex)}${normalized.slice(suffixStart)}`;
  }

  if (!patchLines || patchLines.length === 0) return ensureTrailingNewline(withoutExisting.replace(/\s+$/, ""));

  const block = [start, ...patchLines.map((line) => `  ${line}`), end].join("\n");
  return insertBlockUnderPatch(withoutExisting, block);
}
