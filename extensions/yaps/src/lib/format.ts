const MAX_TITLE_LENGTH = 80;
const MAX_TITLE_SOURCE_LENGTH = 4_096;

export function titleFromClipboard(content: string, now = new Date()): string {
  const firstLine = firstNonEmptyLine(content);

  if (!firstLine) {
    return `Clipboard ${formatDateTime(now)}`;
  }

  const withoutMarkdown = firstLine
    .replace(/^(?:(?:#{1,6}\s+|>\s*|(?:[-*+]\s+|\d+[.)]\s+)))+/, "")
    .replace(/^(?:\[[ xX]\]\s+)+/, "")
    .replace(/!?\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__|~~|`)(.+?)\1/g, "$2")
    .replace(/\s+/g, " ")
    .trim();

  const urlTitle = titleForUrl(withoutMarkdown);
  const candidate = urlTitle ?? (withoutMarkdown || firstLine);
  const characters = [...candidate];
  if (characters.length <= MAX_TITLE_LENGTH) {
    return candidate;
  }

  return `${characters
    .slice(0, MAX_TITLE_LENGTH - 1)
    .join("")
    .trimEnd()}…`;
}

function firstNonEmptyLine(content: string): string | undefined {
  let lineStart = 0;
  while (lineStart <= content.length) {
    const newlineIndex = content.indexOf("\n", lineStart);
    const carriageReturnIndex = content.indexOf("\r", lineStart);
    const breakIndex = firstLineBreak(newlineIndex, carriageReturnIndex);
    const lineEnd = breakIndex === -1 ? content.length : breakIndex;
    const line = content.slice(lineStart, lineEnd).trim();

    if (line) {
      return [...line].slice(0, MAX_TITLE_SOURCE_LENGTH).join("");
    }

    if (breakIndex === -1) {
      break;
    }
    lineStart = breakIndex + (content[breakIndex] === "\r" && content[breakIndex + 1] === "\n" ? 2 : 1);
  }

  return undefined;
}

function firstLineBreak(newlineIndex: number, carriageReturnIndex: number): number {
  if (newlineIndex === -1) {
    return carriageReturnIndex;
  }
  if (carriageReturnIndex === -1) {
    return newlineIndex;
  }
  return Math.min(newlineIndex, carriageReturnIndex);
}

function titleForUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
    return `Saved link · ${url.hostname.replace(/^www\./, "")}`;
  } catch {
    return undefined;
  }
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function previewMarkdown(markdown: string, maxLength = 12_000): string {
  if (markdown.length <= maxLength) {
    return markdown;
  }
  return `${[...markdown].slice(0, maxLength).join("").trimEnd()}\n\n_Continue reading in the Markdown file._`;
}

export function clipboardMarkdown(content: string): string {
  return content.endsWith("\n") ? content : `${content}\n`;
}

export function displaySource(source: string): string {
  return source
    .split("_")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
