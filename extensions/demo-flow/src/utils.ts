export function previewText(text: string, maxLength = 60): string {
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const normalized = firstLine.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
}

export function ensureUniqueDemoName(name: string, existingNames: Set<string>): string {
  const base = name.trim() || "Untitled Demo";
  if (!existingNames.has(base)) {
    return base;
  }
  let counter = 1;
  while (true) {
    const candidate = `${base} (Imported${counter === 1 ? "" : ` ${counter}`})`;
    if (!existingNames.has(candidate)) {
      return candidate;
    }
    counter += 1;
  }
}

export function splitSnippetLines(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}
