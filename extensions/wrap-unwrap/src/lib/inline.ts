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
  // Link labels may contain ONE level of nested brackets (`[outer [inner] label]`),
  // which a flat `[^\]]*?` cannot span — the label then got reflowed mid-link.
  // Nesting deeper than one level is rare enough to leave unprotected; a fully
  // recursive match needs a parser, not a regex.
  // The destination tolerates ONE level of balanced parens — CommonMark allows them,
  // and stopping at the first ")" split an atomic link across lines.
  /\[(?:[^[\]]|\[[^[\]]*\])*\]\((?:[^()]|\([^()]*\))*\)/g,
  /\[(?:[^[\]]|\[[^[\]]*\])*\]\[[^\]]*?\]/g,
  /<(?:https?:\/\/|mailto:)[^>\s]+>/g,
  /<[^\s@<>]+@[^\s@<>]+>/g,
];

/**
 * Placeholder sentinel — U+E000, a Unicode Private Use Area character that
 * (a) is a single code point with no whitespace semantics, so reflow won't
 * split inside a placeholder, and (b) is exceedingly unlikely to appear in
 * user input. The index is wrapped in a trailing sentinel too, so a literal
 * digit immediately after a token in the source can't bleed into the index.
 */
const PLACEHOLDER = String.fromCodePoint(0xe000);
const RESTORE_PATTERN = new RegExp(`${PLACEHOLDER}(\\d+)${PLACEHOLDER}`, "g");

/**
 * Second private-use code point, used to escape any sentinel that was ALREADY in
 * the user's text. Without this, input literally containing `U+E000 0 U+E000` was
 * read as "token 0" on restore and replaced with unrelated content (or deleted
 * when the index was out of range) — fabricating text the user never wrote.
 *
 * `protectInline` escapes `U+E000` → `U+E001` before allocating any placeholder;
 * `restoreInline` unescapes last, after all real placeholders are consumed. Any
 * pre-existing `U+E001` is doubled so the mapping stays reversible.
 */
const SENTINEL_ESCAPE = String.fromCodePoint(0xe001);
const ESCAPE_PATTERN = new RegExp(`[${PLACEHOLDER}${SENTINEL_ESCAPE}]`, "g");
const UNESCAPE_PATTERN = new RegExp(`${SENTINEL_ESCAPE}([01])`, "g");

export type Protected = {
  protected: string;
  tokens: string[];
};

export function protectInline(input: string): Protected {
  const tokens: string[] = [];
  // Escape any sentinel already present in the user's text so it can never be
  // mistaken for one of our placeholders on restore.
  let working = input.replace(ESCAPE_PATTERN, (ch) => SENTINEL_ESCAPE + (ch === PLACEHOLDER ? "0" : "1"));
  for (const pattern of INLINE_PATTERNS) {
    working = working.replace(pattern, (match) => {
      const idx = tokens.length;
      tokens.push(match);
      return `${PLACEHOLDER}${idx}${PLACEHOLDER}`;
    });
  }
  return { protected: working, tokens };
}

/** Reverse the sentinel escaping applied by `protectInline`. Must run LAST. */
function unescapeSentinels(input: string): string {
  return input.replace(UNESCAPE_PATTERN, (_, which) => (which === "0" ? PLACEHOLDER : SENTINEL_ESCAPE));
}

export function restoreInline(input: string, tokens: string[]): string {
  const restored =
    tokens.length === 0
      ? input
      : input.replace(RESTORE_PATTERN, (whole, idxStr) => {
          const idx = Number.parseInt(idxStr, 10);
          // An out-of-range index is not ours — leave it verbatim rather than
          // deleting the user's text.
          return idx < tokens.length ? tokens[idx] : whole;
        });
  return unescapeSentinels(restored);
}
