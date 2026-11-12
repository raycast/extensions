// Query words in bold in a passage, matched as the app does (LanternCore QueryHighlight + TextFold): case and accents
// ignored, ł/ø/ß folded, whole words that start with a query stem, so "faktura" marks "faktury" and "zolw" "żółw".

const FOLD: Record<string, string> = { ł: "l", Ł: "l", ø: "o", Ø: "o", ß: "s", æ: "a", Æ: "a", œ: "o", Œ: "o", đ: "d", Đ: "d" };

/** One folded character per original character, so positions in the folded text are positions in the original. */
function fold(text: string): string {
  let out = "";
  for (const ch of text) {
    const base = FOLD[ch] ?? ch.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    const lower = ch.toLowerCase();
    out += base.length === 1 ? base : lower.length === ch.length ? lower : "?".repeat(ch.length);
  }
  return out;
}

const SKIPPED = new Set([
  "the", "and", "for", "with", "about", "when", "that", "this", "from", "into", "what", "where", "was", "were",
  "jak", "dla", "czy", "nie", "sie", "oraz", "przez", "przy", "jest", "gdzie", "kiedy", "albo", "lub",
]);
const WORD = /[\p{L}\p{N}]/u;

/** Stems to look for (LanternCore QueryHighlight.stems): words of 3+ characters (2+ for numbers), common words
 * skipped, long words without their last two letters so Polish endings may differ ("faktura" marks "faktury"). */
export function terms(query: string): string[] {
  const out = new Set<string>();
  for (const part of fold(query).split(/[^\p{L}\p{N}]+/u)) {
    const number = /^\p{N}+$/u.test(part);
    if (part.length < (number ? 2 : 3) || SKIPPED.has(part)) continue;
    out.add(part.length >= 7 ? part.slice(0, -2) : part);
  }
  return [...out];
}

/** Escapes markdown without backslashes before brackets, parentheses or $: Raycast's markdown reads \( \) \[ \] and
 * $…$ as LaTeX math (passages turned into italic formulas), so those become HTML entities or stay as they are. */
function escapeMarkdown(text: string): string {
  return text
    .replace(/([\\`*_#|>~<])/g, "\\$1")
    .replace(/\[/g, "&#91;")
    .replace(/\]/g, "&#93;")
    .replace(/\$/g, "&#36;")
    .replace(/^(\s*)([-+])(\s)/gm, "$1\\$2$3") // a line starting like a list item stays text
    .replace(/^(\s*\d+)\.(\s)/gm, "$1\\.$2");
}

/** Markdown with every whole word that starts with a query stem in bold; everything else escaped. */
export function highlight(text: string, query: string): string {
  const stems = terms(query);
  if (!stems.length) return escapeMarkdown(text);
  const folded = fold(text);
  const found: [number, number][] = [];
  for (const stem of stems) {
    for (let i = folded.indexOf(stem); i >= 0; i = folded.indexOf(stem, i + 1)) {
      if (i > 0 && WORD.test(folded[i - 1])) continue;
      let end = i + stem.length;
      while (end < folded.length && WORD.test(folded[end])) end++;
      found.push([i, end]);
    }
  }
  found.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of found) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  let out = "";
  let at = 0;
  for (const [a, b] of merged) {
    out += escapeMarkdown(text.slice(at, a)) + "**" + escapeMarkdown(text.slice(a, b)) + "**";
    at = b;
  }
  return out + escapeMarkdown(text.slice(at));
}

/** A window of a long passage around its first query word, so the match is on screen. */
export function around(text: string, query: string, max = 1400): string {
  if (text.length <= max) return text;
  const folded = fold(text);
  const first = Math.min(...terms(query).map((t) => folded.indexOf(t)).filter((i) => i >= 0), text.length);
  const start = first >= text.length ? 0 : Math.max(0, first - Math.floor(max / 3));
  const cut = text.slice(start, start + max);
  return (start > 0 ? "…" : "") + cut + (start + max < text.length ? "…" : "");
}
