export function normalizeMarkdownText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function escapeMarkdownText(value: string): string {
  return normalizeMarkdownText(value)
    .replace(/\\/g, "\\\\")
    .replace(/([`*_[\]{}()#+.!|>-])/g, "\\$1");
}

export function escapeMarkdownLinkTarget(target: string): string {
  return target.replace(/\s/g, "%20").replace(/>/g, "%3E");
}

export function formatMarkdownLink(text: string, target: string): string {
  return `[${escapeMarkdownText(text)}](<${escapeMarkdownLinkTarget(target)}>)`;
}
