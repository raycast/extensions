// Escaping helpers for the two markup targets network text ends up in:
// hand-built SVG (XML) and Raycast markdown. Pure module.

/** Characters XML 1.0 forbids even when escaped; a single one makes the whole SVG unparseable. */
// eslint-disable-next-line no-control-regex
const XML_ILLEGAL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

/** Safe inside text nodes and single- or double-quoted attributes. */
export function escapeXml(s: string): string {
  return s
    .replace(XML_ILLEGAL, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Neutralise markdown syntax in an inline fragment (place names, alert text). */
export function escapeMarkdown(s: string): string {
  return s.replace(/[\\`*_{}[\]()#+\-!|>~]/g, "\\$&");
}

/** Markdown image alt text: no brackets or line breaks, which would end the image early. */
export function markdownAlt(s: string): string {
  return s.replace(/[[\]\\]/g, "\\$&").replace(/\s+/g, " ");
}
