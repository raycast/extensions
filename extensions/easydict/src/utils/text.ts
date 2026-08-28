/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

/**
 * Trim the text to the max length, default 1830.
 *
 * * Note: google web translate max length is 1830.
 */
export function trimTextLength(text: string, length = 1830) {
  text = text.trim();
  if (text.length > length) {
    return text.substring(0, length) + "...";
  }
  return text.substring(0, length);
}

/**
 * Decode basic HTML entities to their raw text representation.
 */
export function unescapeHtml(html: string): string {
  return html.replace(/&(#\d+|#x[a-fA-F0-9]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity.startsWith("#x")) {
      return String.fromCharCode(parseInt(entity.slice(2), 16));
    } else if (entity.startsWith("#")) {
      return String.fromCharCode(parseInt(entity.slice(1), 10));
    } else {
      const map: Record<string, string> = {
        amp: "&",
        lt: "<",
        gt: ">",
        quot: '"',
        apos: "'",
        nbsp: " ",
      };
      return map[entity] || match;
    }
  });
}
