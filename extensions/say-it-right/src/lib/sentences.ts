const ABBREVIATIONS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "sr",
  "jr",
  "st",
  "vs",
  "etc",
  "e.g",
  "i.e",
  "a.m",
  "p.m",
  "g.o.p",
  "u.s",
  "u.k",
  "e.u",
  "u.n",
  "d.c",
  "a.i",
]);

/** Split English text into sentences. Deterministic and offline. */
export function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    if (
      ch === "." &&
      /\d/.test(normalized[i - 1] ?? "") &&
      /\d/.test(normalized[i + 1] ?? "")
    )
      continue;
    if (ch === ".") {
      const prev = normalized[i - 1] ?? "";
      const next = normalized[i + 1] ?? "";
      if (isUpperLetter(prev) && isUpperLetter(next)) continue;
      const before = normalized.slice(start, i);
      const lastWord = before.split(/\s/).pop()?.toLowerCase() ?? "";
      if (ABBREVIATIONS.has(lastWord)) continue;
      if (isInitialism(`${lastWord}.`)) continue;
    }
    let end = i + 1;
    while (end < normalized.length && "!?.".includes(normalized[end])) end++;
    const sentence = normalized.slice(start, end).trim();
    if (sentence) out.push(sentence);
    start = end;
    i = end - 1;
  }
  const tail = normalized.slice(start).trim();
  if (tail) out.push(tail);
  return out.length > 0 ? out : [normalized];
}

function isInitialism(token: string): boolean {
  return /^(?:[a-z]\.){2,}$/i.test(token);
}

function isUpperLetter(char: string): boolean {
  return /^[A-Z]$/.test(char);
}

export function resolveSentencesPerPage(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 5;
  return Math.min(Math.max(Number.isFinite(n) ? Math.floor(n) : 5, 1), 12);
}
