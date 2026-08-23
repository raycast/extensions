const MARKDOWN_LINK_PATTERN = /!?\[([^\]]+)\]\((\S+?)(?:\s+["'][^)]*["'])?\)/gu;
const AUTOLINK_PATTERN = /<((?:https?:\/\/|mailto:)[^>\s]+)>/giu;
const INLINE_CODE_PATTERN = /`([^`\n]+)`/gu;
const ESCAPED_MARKDOWN_PATTERN =
  /\\(\\|`|\*|_|\[|\]|\{|\}|\(|\)|#|\+|\.|!|\||>|~|-)/gu;
const FENCE_PATTERN = /^\s*(`{3,}|~{3,})/u;
const MARKDOWN_PLACEHOLDER_PATTERN = /\uE000(\d+)\uE000/gu;

function cleanInline(text: string): string {
  const protectedValues: string[] = [];
  const protect = (value: string): string => {
    const index = protectedValues.push(value) - 1;
    return `\uE000${index}\uE000`;
  };

  const cleaned = text
    .replace(MARKDOWN_LINK_PATTERN, (_match, label: string, url: string) => {
      const cleanedLabel = cleanInline(label);
      return protect(cleanedLabel ? `${cleanedLabel} (${url})` : url);
    })
    .replace(AUTOLINK_PATTERN, (_match, value: string) => protect(value))
    .replace(INLINE_CODE_PATTERN, (_match, value: string) => protect(value))
    .replace(ESCAPED_MARKDOWN_PATTERN, (_match, value: string) =>
      protect(value),
    )
    .replace(/<\/?[A-Za-z][^>]*>/gu, "")
    .replace(
      /(?<![\p{L}\p{N}])(\*{3}|___)(?=\S)([^\n]*?\S)\1(?![\p{L}\p{N}])/gu,
      "$2",
    )
    .replace(
      /(?<![\p{L}\p{N}])(\*{2}|__)(?=\S)([^\n]*?\S)\1(?![\p{L}\p{N}])/gu,
      "$2",
    )
    .replace(/(?<![\p{L}\p{N}])~~(?=\S)([^\n]*?\S)~~(?![\p{L}\p{N}])/gu, "$1")
    .replace(
      /(?<![\p{L}\p{N}])([*_])(?=\S)([^*_\n]*?\S)\1(?![\p{L}\p{N}])/gu,
      "$2",
    );

  return cleaned.replace(
    MARKDOWN_PLACEHOLDER_PATTERN,
    (match, index: string) => {
      return protectedValues[Number(index)] ?? match;
    },
  );
}

function cleanLine(line: string): string {
  const cleaned = line
    .replace(/^\s{0,3}(?:>\s?)+/u, "")
    .replace(/^\s{0,3}#{1,6}(?:\s+|$)/u, "")
    .replace(/\s+#{1,6}\s*$/u, "");

  if (/^\s*(?:[-*_]\s*){3,}$/u.test(cleaned)) {
    return "";
  }

  const task = cleaned.match(/^(\s*)[-+*]\s+\[([ xX])\]\s+(.*)$/u);
  if (task) {
    const marker = task[2].toLowerCase() === "x" ? "☑" : "☐";
    return `${task[1]}${marker} ${cleanInline(task[3])}`;
  }

  const unordered = cleaned.match(/^(\s*)[-+*]\s+(.*)$/u);
  if (unordered) {
    return `${unordered[1]}• ${cleanInline(unordered[2])}`;
  }

  const ordered = cleaned.match(/^(\s*)(\d+)[.)]\s+(.*)$/u);
  if (ordered) {
    return `${ordered[1]}${ordered[2]}) ${cleanInline(ordered[3])}`;
  }

  const reference = cleaned.match(/^\s*\[[^\]]+\]:\s*(\S+)\s*$/u);
  if (reference) {
    return reference[1];
  }

  return cleanInline(cleaned);
}

/** Remove common Markdown syntax while keeping the readable text. */
export function cleanMarkdown(text: string): string {
  let inFence = false;
  const lines = text.replace(/\r\n?/gu, "\n").split("\n");
  const cleanedLines = lines.map((line) => {
    if (FENCE_PATTERN.test(line)) {
      inFence = !inFence;
      return "";
    }

    return inFence ? line : cleanLine(line);
  });

  return cleanedLines
    .join("\n")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}
