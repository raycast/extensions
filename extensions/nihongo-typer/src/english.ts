import englishIndexData from "./data/english-index.json";

const ENGLISH_MIN_WORD_LENGTH = 2;
const ENGLISH_MAX_RESULTS = 8;

export interface WordEntry {
  reading: string;
  kanji?: string;
  gloss: string;
  pos?: string;
}

// English -> Japanese search data: `words` is a deduped table of { reading,
// kanji?, gloss } entries, and `entries` maps an english gloss word to indices
// into that table — see scripts/build-kanji-dictionary.mjs for how both are
// derived from the same jmdict-simplified release as the kanji dictionary.
const englishWords = englishIndexData.words as WordEntry[];
const englishIndex = new Map<string, number[]>(
  englishIndexData.entries as [string, number[]][],
);
// Same list the index was built with, shipped in the data file rather than
// restated here so the two can't drift apart.
const englishStopwords = new Set(englishIndexData.stopwords as string[]);

export function searchEnglish(query: string): WordEntry[] {
  // Stopwords are dropped rather than matched: they were never indexed, and
  // requiring them as a literal substring of the gloss is what made "cup of tea"
  // return nothing while "cup tea" worked (no gloss spells out "of").
  const words = query
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter(
      (w) => w.length >= ENGLISH_MIN_WORD_LENGTH && !englishStopwords.has(w),
    );
  if (words.length === 0) return [];

  const indexed = words.filter((w) => englishIndex.has(w));
  if (indexed.length === 0) return [];

  // Anchor on the *most specific* word — the one with the fewest candidates —
  // rather than the first one. Each token keeps only its top
  // MAX_CANDIDATES_PER_TOKEN entries, so anchoring on a broad adjective like
  // "green" searches a truncated list that may not contain the compound the
  // user means, while its narrower partner ("tea") usually does.
  const bySpecificity = [...indexed].sort(
    (a, b) => englishIndex.get(a)!.length - englishIndex.get(b)!.length,
  );
  const [anchor, ...otherIndexed] = bySpecificity;
  const anchorIndices = englishIndex.get(anchor)!;

  // Prefer a real intersection of the per-word candidate sets; fall back to the
  // looser "anchor candidates whose gloss mentions the other words" when the
  // truncated lists don't overlap.
  const otherSets = otherIndexed.map((w) => new Set(englishIndex.get(w)!));
  const intersection = anchorIndices.filter((i) =>
    otherSets.every((set) => set.has(i)),
  );
  const matched = intersection.length > 0;

  // A word that is in no gloss at all can't be dropped like a stopword — it is
  // a real constraint the user typed, so it must still exclude everything.
  const unknown = words.filter((w) => !englishIndex.has(w));
  const glossFilters = matched ? unknown : [...otherIndexed, ...unknown];

  const candidates = (matched ? intersection : anchorIndices).map(
    (i) => englishWords[i],
  );
  // Whole-word match, not substring: the index itself is word-tokenised, and
  // `includes()` let "tea" match コーヒーカップ's "spinning teacups", ranking a
  // coffee cup above 茶碗 for "cup of tea". Same tokeniser as the query above.
  const filtered =
    glossFilters.length === 0
      ? candidates
      : candidates.filter((c) => {
          const words = new Set(c.gloss.toLowerCase().split(/[^a-z']+/));
          return glossFilters.every((w) => words.has(w));
        });
  return filtered.slice(0, ENGLISH_MAX_RESULTS);
}
