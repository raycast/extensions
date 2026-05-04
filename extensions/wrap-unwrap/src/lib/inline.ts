// src/lib/inline.ts

/**
 * Match inline tokens that must never be split during reflow.
 * Order matters: longer/more-specific patterns first.
 *
 *   1. Double-backtick code spans (``...``) — must come before single-backtick.
 *   2. Single-backtick code spans (`...`).
 *   3. Inline links: [text](url) — url may contain spaces, so we lazy-match through `)`.
 *   4. Reference links: [text][id].
 *   5. Autolinks: <https://...>, <mailto:...>, <user@host>.
 */
const INLINE_PATTERNS = [
  /``[\s\S]*?``/g,
  /`[^`\n]+?`/g,
  /\[[^\]]*?\]\([^)]*?\)/g,
  /\[[^\]]*?\]\[[^\]]*?\]/g,
  /<(?:https?:\/\/|mailto:)[^>\s]+>/g,
  /<[^\s@<>]+@[^\s@<>]+>/g,
];

/**
 * Placeholder sentinel — U+E000, a Unicode Private Use Area character that
 * (a) is a single code point with no whitespace semantics, so reflow won't
 * split inside a placeholder, and (b) is exceedingly unlikely to appear in
 * user input. Followed by the token's index.
 */
const PLACEHOLDER = String.fromCodePoint(0xe000);
const RESTORE_PATTERN = new RegExp(`${PLACEHOLDER}(\\d+)`, "g");

export type Protected = {
  protected: string;
  tokens: string[];
};

export function protectInline(input: string): Protected {
  const tokens: string[] = [];
  let working = input;
  for (const pattern of INLINE_PATTERNS) {
    working = working.replace(pattern, (match) => {
      const idx = tokens.length;
      tokens.push(match);
      return `${PLACEHOLDER}${idx}`;
    });
  }
  return { protected: working, tokens };
}

export function restoreInline(input: string, tokens: string[]): string {
  if (tokens.length === 0) return input;
  return input.replace(RESTORE_PATTERN, (_, idxStr) => {
    const idx = Number.parseInt(idxStr, 10);
    return tokens[idx] ?? "";
  });
}
