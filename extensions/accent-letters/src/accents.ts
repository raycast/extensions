/**
 * The accent rules, kept identical to the Accent Letters website, apps and every other add-on.
 *
 * Pure functions with no Raycast imports, so they can be exercised without the extension host.
 */

/** Letters with no canonical decomposition: NFD leaves them untouched, so they need a table. */
const SPECIAL: Record<string, string> = {
  ø: "o", Ø: "O", ł: "l", Ł: "L", đ: "d", Đ: "D", ħ: "h", Ħ: "H", ı: "i", ŧ: "t", Ŧ: "T",
  ß: "ss", ẞ: "SS", æ: "ae", Æ: "AE", œ: "oe", Œ: "OE", þ: "th", Þ: "Th", ð: "d", Ð: "D",
};
const SPECIAL_RE = new RegExp(`[${Object.keys(SPECIAL).join("")}]`, "g");

/**
 * The guard that makes this safe on mixed text.
 *
 * Stripping every `\p{M}` is wrong, and destructively so: a combining mark is not always an accent.
 * In Devanagari the virama is a mark, so क्षत्रिय became कषतरय. In Thai the vowels are marks, so
 * สวัสดี became สวสด. Even ❤️ lost its variation selector and became ❤. The command is handed the
 * user's whole selection, so any of those could be in it.
 *
 * So a character is only touched when its decomposition starts with a LATIN letter. Everything else
 * — every other script, emoji, punctuation, a stray combining mark on its own — is returned exactly
 * as it came in.
 */
const LATIN = /\p{Script=Latin}/u;

/**
 * NFD, not NFKD: removing accents must leave everything else alone, and a compatibility
 * decomposition would also rewrite ﬁ to fi and ½ to 1⁄2.
 *
 * No lookbehind anywhere in this file. Raycast runs on macOS today, but the same rules are shared
 * with the Obsidian plugin, where a lookbehind breaks on older iOS.
 *
 * The table runs AFTER the decomposition, never instead of it: ǣ decomposes to æ plus a macron,
 * and æ itself has no plain form, so it still has to become "ae".
 */
function stripChar(c: string): string {
  const decomposed = c.normalize("NFD");

  if (!LATIN.test(decomposed[0])) {
    return c;
  }

  return decomposed.replace(/\p{M}/gu, "").replace(SPECIAL_RE, (x) => SPECIAL[x]);
}

export function removeAccents(text: string): string {
  return [...text.normalize("NFC")].map(stripChar).join("");
}

export function countChanged(before: string, after: string): number {
  let changed = 0;
  for (const c of [...before.normalize("NFC")]) {
    if (stripChar(c) !== c) changed++;
  }
  return changed;
}
