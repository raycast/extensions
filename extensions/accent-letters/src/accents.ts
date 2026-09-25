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

const LATIN = /\p{Script=Latin}/u;
const MARK = /\p{M}/u;

/**
 * Strips one cluster: a base character plus every combining mark that follows it.
 *
 * Working a cluster at a time, rather than a code point at a time, is what makes this correct:
 *
 *  - `ạ́` normalises to `ạ` followed by a SEPARATE acute, because no single code point
 *    carries both marks. Handling code points individually turned `ạ` into "a" and then left the
 *    acute stranded, giving back "á" — still accented.
 *  - A combining mark is not always an accent. The Devanagari virama, Thai vowels, Arabic harakat
 *    and an emoji variation selector are all marks, so only a LATIN base is ever stripped.
 *
 * NFD, not NFKD: a compatibility decomposition would also rewrite ﬁ to fi and ½ to 1⁄2, which is a
 * different operation from the one the user asked for.
 *
 * No lookbehind anywhere. Raycast is macOS only, but these rules are shared with the Obsidian
 * plugin, where a lookbehind fails silently on older iOS.
 */
function stripCluster(base: string, marks: string): string {
  // Everything that is not Latin keeps its marks, exactly as it arrived.
  if (!LATIN.test(base)) return base + marks;

  // The table runs AFTER the decomposition, never instead of it: ǣ decomposes to æ plus a macron,
  // and æ itself has no plain form, so it still has to become "ae".
  return (base + marks)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(SPECIAL_RE, (x) => SPECIAL[x]);
}

/**
 * The ORIGINAL text is walked, with no normalisation first, because anything this function does
 * not strip has to come back byte for byte. Normalising to NFC up front rewrote text it then left
 * alone: decomposed Cyrillic и + breve came back as й, and decomposed Hangul jamo were composed
 * into 한 — the text was changed while the caller was told nothing had changed.
 *
 * Normalising to NFD up front is worse: it splits a Hangul syllable into jamo, which are letters
 * rather than marks, so the walk handed 한 back as three separate characters.
 *
 * Normalisation belongs in stripCluster instead, applied to the one cluster being stripped — which
 * is what makes decomposed and precomposed Latin give the same answer.
 */
function clusters(text: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  let i = 0;

  while (i < text.length) {
    const base = String.fromCodePoint(text.codePointAt(i) as number);
    i += base.length;

    let marks = "";
    while (i < text.length) {
      const c = String.fromCodePoint(text.codePointAt(i) as number);
      if (!MARK.test(c)) break;
      marks += c;
      i += c.length;
    }
    out.push([base, marks]);
  }
  return out;
}

export function removeAccents(text: string): string {
  return clusters(text)
    .map(([base, marks]) => stripCluster(base, marks))
    .join("");
}

export function countChanged(before: string, after: string): number {
  let changed = 0;
  for (const [base, marks] of clusters(before)) {
    if (stripCluster(base, marks) !== base + marks) changed++;
  }
  return changed;
}
