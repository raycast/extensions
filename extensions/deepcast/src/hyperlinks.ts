const HTML_HYPERLINK_PATTERN = /<a\b[^>]*\bhref\s*=/i;
const MARKDOWN_HYPERLINK_PATTERN = /(?<!!)\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+|www\.[^)\s]+)\)/;
const MARKDOWN_HYPERLINK_GLOBAL_PATTERN = /(?<!!)\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+|www\.[^)\s]+)\)/g;
const HTML_ANCHOR_GLOBAL_PATTERN = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;

export function containsHtmlHyperlinks(text: string): boolean {
  return HTML_HYPERLINK_PATTERN.test(text);
}

export function containsMarkdownHyperlinks(text: string): boolean {
  return MARKDOWN_HYPERLINK_PATTERN.test(text);
}

export function normalizeForCompare(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function extractHtmlFragment(html: string): string {
  const fragment = html.match(/<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/);
  if (fragment?.[1]) {
    return fragment[1].trim();
  }

  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (body?.[1]) {
    return body[1].trim();
  }

  const htmlStart = html.search(/<html[\s>]/i);
  if (htmlStart > 0) {
    return html.slice(htmlStart).trim();
  }

  return html.trim();
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function unescapeHtml(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function stripHtmlTags(html: string): string {
  return unescapeHtml(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|h[1-6]|li|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  ).replace(/[ \t]+\n/g, "\n");
}

export function markdownLinksToHtml(text: string): string {
  return text.replace(MARKDOWN_HYPERLINK_GLOBAL_PATTERN, (_match, label: string, url: string) => {
    return `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`;
  });
}

export function htmlLinksToMarkdown(html: string): string {
  return html.replace(HTML_ANCHOR_GLOBAL_PATTERN, (_match, doubleQuoted, singleQuoted, unquoted, inner) => {
    const href = unescapeHtml(doubleQuoted || singleQuoted || unquoted || "");
    const label = stripHtmlTags(inner).replace(/\s+/g, " ").trim();
    return `[${label}](${href})`;
  });
}

export function htmlToPlainText(html: string): string {
  return stripHtmlTags(html)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function htmlToDisplayText(html: string): string {
  return htmlToPlainText(htmlLinksToMarkdown(html));
}

export function toClipboardHtml(fragment: string): string {
  if (/<html[\s>]/i.test(fragment)) {
    return fragment;
  }
  return `<html><body>${fragment}</body></html>`;
}

export function prepareFromText(text: string): { text: string; isHtml: boolean } {
  if (containsHtmlHyperlinks(text)) {
    return { text, isHtml: true };
  }
  if (containsMarkdownHyperlinks(text)) {
    return { text: markdownLinksToHtml(text), isHtml: true };
  }
  return { text, isHtml: false };
}

export function prepareFromClipboardHtml(
  text: string,
  clipboardText: string | undefined,
  clipboardHtml: string | undefined,
): { text: string; isHtml: boolean } {
  if (clipboardHtml && clipboardText && normalizeForCompare(text) === normalizeForCompare(clipboardText)) {
    const fragment = extractHtmlFragment(clipboardHtml);
    if (containsHtmlHyperlinks(fragment)) {
      return { text: fragment, isHtml: true };
    }
  }
  return prepareFromText(text);
}
