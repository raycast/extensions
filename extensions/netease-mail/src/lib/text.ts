import { htmlToText } from "html-to-text";

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function makeSnippet(value: string | undefined, maxLength = 180): string {
  if (!value) {
    return "";
  }

  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

export function htmlToReadableText(html: string): string {
  return htmlToText(html, {
    wordwrap: false,
    selectors: [
      { selector: "a", options: { ignoreHref: false } },
      { selector: "img", format: "skip" },
    ],
  });
}

export function escapeImapSearchValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
