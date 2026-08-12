export type RandomSource = () => number;

export interface ScrambleOptions {
  random?: RandomSource;
  scrambleNumbers?: boolean;
  candidateCount?: number;
}

const TOKEN_PATTERN = /(?:\p{L}\p{M}*)+|\p{N}+/gu;
const LETTER_PATTERN = /^(?:\p{L}\p{M}*)+$/u;
const LETTER_CHARACTER_PATTERN = /^\p{L}$/u;
const COMBINING_MARK_PATTERN = /^\p{M}$/u;
const DECIMAL_DIGIT_PATTERN = /^\p{Nd}$/u;
const VOWEL_PATTERN = /[aeiou]/;
const TRIPLE_VOWEL_PATTERN = /[aeiou]{3}/;
const TRIPLE_CONSONANT_PATTERN = /[^aeiou]{3}/;
const REPEATED_BIGRAM_PATTERN = /([a-z]{2})\1/;

const VOWELS = ["a", "a", "a", "e", "e", "e", "e", "i", "i", "o", "o", "u"];
const CONSONANTS = [
  "b",
  "c",
  "d",
  "f",
  "g",
  "h",
  "l",
  "l",
  "l",
  "m",
  "m",
  "m",
  "n",
  "n",
  "n",
  "n",
  "p",
  "r",
  "r",
  "r",
  "r",
  "s",
  "s",
  "s",
  "t",
  "t",
  "t",
  "v",
  "v",
  "w",
];
const END_CONSONANTS = ["d", "l", "l", "m", "n", "n", "r", "r", "s", "s", "t"];
const CLUSTER_FOLLOWERS: Record<string, readonly string[]> = {
  b: ["l", "r"],
  c: ["h", "l", "r"],
  d: ["r"],
  f: ["l", "r"],
  g: ["l", "r"],
  p: ["l", "r"],
  s: ["c", "h", "l", "p", "t"],
  t: ["h", "r"],
};

const COMMON_WORDS = new Set([
  "a",
  "about",
  "after",
  "again",
  "all",
  "also",
  "am",
  "an",
  "and",
  "another",
  "any",
  "are",
  "as",
  "at",
  "back",
  "bad",
  "be",
  "because",
  "before",
  "being",
  "best",
  "better",
  "big",
  "brand",
  "but",
  "by",
  "can",
  "car",
  "cat",
  "clear",
  "come",
  "could",
  "day",
  "deck",
  "design",
  "did",
  "do",
  "dog",
  "down",
  "each",
  "even",
  "every",
  "feel",
  "first",
  "for",
  "from",
  "get",
  "give",
  "go",
  "good",
  "great",
  "had",
  "has",
  "have",
  "he",
  "her",
  "here",
  "him",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "just",
  "know",
  "last",
  "like",
  "light",
  "little",
  "look",
  "make",
  "man",
  "many",
  "may",
  "me",
  "more",
  "most",
  "my",
  "need",
  "new",
  "no",
  "not",
  "now",
  "of",
  "off",
  "old",
  "on",
  "once",
  "one",
  "only",
  "or",
  "other",
  "our",
  "out",
  "over",
  "own",
  "people",
  "put",
  "red",
  "same",
  "say",
  "see",
  "set",
  "shape",
  "she",
  "should",
  "so",
  "some",
  "still",
  "story",
  "sun",
  "take",
  "text",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "thing",
  "think",
  "this",
  "those",
  "through",
  "time",
  "to",
  "too",
  "two",
  "under",
  "up",
  "us",
  "use",
  "very",
  "want",
  "was",
  "way",
  "we",
  "well",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "why",
  "will",
  "with",
  "work",
  "world",
  "would",
  "year",
  "you",
  "your",
]);

const UNWELCOME_FRAGMENTS = [
  "anus",
  "ass",
  "cock",
  "cunt",
  "dick",
  "fuck",
  "hate",
  "kill",
  "nazi",
  "porn",
  "rape",
  "sex",
  "shit",
  "slut",
];

const WIDTHS: Record<string, number> = {
  i: 0.34,
  j: 0.43,
  l: 0.38,
  f: 0.55,
  r: 0.58,
  t: 0.56,
  c: 0.82,
  s: 0.82,
  v: 0.86,
  x: 0.86,
  y: 0.86,
  z: 0.8,
  a: 0.9,
  b: 0.92,
  d: 0.92,
  e: 0.88,
  g: 0.92,
  h: 0.94,
  k: 0.9,
  n: 0.94,
  o: 0.94,
  p: 0.92,
  q: 0.94,
  u: 0.94,
  m: 1.34,
  w: 1.28,
};

function pick<T>(items: readonly T[], random: RandomSource): T {
  const index = Math.min(items.length - 1, Math.floor(random() * items.length));
  return items[index];
}

function isVowel(char: string): boolean {
  return VOWEL_PATTERN.test(char);
}

function makeCandidate(length: number, random: RandomSource): string {
  if (length === 1) return pick(VOWELS, random);

  const result: string[] = [];

  for (let index = 0; index < length; index++) {
    if (index === 0) {
      result.push(random() < 0.18 ? pick(VOWELS, random) : pick(CONSONANTS, random));
      continue;
    }

    const previous = result[index - 1];
    const beforePrevious = result[index - 2];
    const finalPosition = index === length - 1;

    if (finalPosition) {
      if (isVowel(previous)) {
        result.push(
          random() < 0.07
            ? pick(
                VOWELS.filter((letter) => letter !== previous),
                random,
              )
            : pick(END_CONSONANTS, random),
        );
      } else {
        result.push(pick(VOWELS, random));
      }
      continue;
    }

    if (isVowel(previous)) {
      const mustUseConsonant = beforePrevious !== undefined && isVowel(beforePrevious);
      result.push(mustUseConsonant || random() < 0.95 ? pick(CONSONANTS, random) : pick(VOWELS, random));
      continue;
    }

    const followers = CLUSTER_FOLLOWERS[previous];
    const alreadyInCluster = beforePrevious !== undefined && !isVowel(beforePrevious);
    if (!alreadyInCluster && followers && random() < 0.18) {
      result.push(pick(followers, random));
    } else {
      result.push(pick(VOWELS, random));
    }
  }

  return result.join("");
}

function isUppercaseLetter(char: string): boolean {
  return char !== char.toLowerCase();
}

interface LetterCluster {
  character: string;
  marks: string;
}

function getLetterClusters(source: string): LetterCluster[] {
  const clusters: LetterCluster[] = [];

  for (const char of source.normalize("NFD")) {
    if (LETTER_CHARACTER_PATTERN.test(char)) {
      clusters.push({ character: char, marks: "" });
    } else if (COMBINING_MARK_PATTERN.test(char) && clusters.length > 0) {
      clusters[clusters.length - 1].marks += char;
    }
  }

  return clusters;
}

function applyCasePattern(candidate: string, sourceCharacters: readonly string[]): string {
  return Array.from(candidate)
    .map((char, index) => (isUppercaseLetter(sourceCharacters[index]) ? char.toUpperCase() : char))
    .join("");
}

function restoreCombiningMarks(candidate: string, source: string): string {
  const sourceClusters = getLetterClusters(source);
  const candidateCharacters = Array.from(candidate);
  const restored = sourceClusters.map(({ marks }, index) => `${candidateCharacters[index] ?? ""}${marks}`).join("");

  // Keep each token's original NFC/NFD shape while making equivalent tokens
  // render the same invented word (e.g. `é` and `e\u0301`).
  return restored.normalize(source === source.normalize("NFC") ? "NFC" : "NFD");
}

function glyphWidth(char: string): number {
  if (char === "\t") return 2.08;
  if (/\s/u.test(char)) return 0.52;
  if (/\p{N}/u.test(char)) return 0.92;

  const lower = char.toLowerCase();
  const base = WIDTHS[lower] ?? (/\p{L}/u.test(char) ? 0.94 : 0.5);
  return isUppercaseLetter(char) ? base * 1.06 : base;
}

export function estimateVisualWidth(text: string): number {
  return Array.from(text).reduce((total, char) => total + glyphWidth(char), 0);
}

interface SourceProfile {
  characters: string[];
  characterWidths: number[];
  lower: string;
  width: number;
}

function candidateScore(candidate: string, source: SourceProfile): number {
  const lowerCandidate = candidate.toLowerCase();

  if (lowerCandidate === source.lower) return Number.POSITIVE_INFINITY;
  if (COMMON_WORDS.has(lowerCandidate)) return Number.POSITIVE_INFINITY;
  if (UNWELCOME_FRAGMENTS.some((fragment) => lowerCandidate.includes(fragment))) return Number.POSITIVE_INFINITY;
  if (
    TRIPLE_VOWEL_PATTERN.test(lowerCandidate) ||
    TRIPLE_CONSONANT_PATTERN.test(lowerCandidate) ||
    REPEATED_BIGRAM_PATTERN.test(lowerCandidate)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const styledCandidate = applyCasePattern(candidate, source.characters);
  const candidateCharacters = Array.from(styledCandidate);
  const totalWidthDifference = Math.abs(estimateVisualWidth(styledCandidate) - source.width) / source.width;

  let profileDifference = 0;
  let positionalMatches = 0;
  for (let index = 0; index < source.characters.length; index++) {
    profileDifference += Math.abs(glyphWidth(candidateCharacters[index]) - source.characterWidths[index]);
    if (candidateCharacters[index].toLowerCase() === source.characters[index].toLowerCase()) {
      positionalMatches++;
    }
  }

  profileDifference /= Math.max(source.characters.length, 1);
  const similarity = positionalMatches / Math.max(source.characters.length, 1);
  const unusualLetters = (lowerCandidate.match(/[kwyz]/g) ?? []).length / Math.max(source.characters.length, 1);
  const vowelPairs = (lowerCandidate.match(/[aeiou]{2}/g) ?? []).length / Math.max(source.characters.length, 1);
  return (
    totalWidthDifference * 6 + profileDifference * 0.34 + similarity * 0.42 + unusualLetters * 0.18 + vowelPairs * 0.08
  );
}

function createBaseWord(source: string, random: RandomSource, requestedCandidateCount?: number): string {
  const sourceCharacters = Array.from(source);
  const sourceCharacterWidths = sourceCharacters.map(glyphWidth);
  const length = sourceCharacters.length;
  const candidateCount = requestedCandidateCount ?? (length <= 2 ? 32 : length > 40 ? 40 : 96);
  const sourceProfile: SourceProfile = {
    characters: sourceCharacters,
    characterWidths: sourceCharacterWidths,
    lower: source.toLowerCase(),
    width: Math.max(
      sourceCharacterWidths.reduce((total, width) => total + width, 0),
      0.01,
    ),
  };
  let bestCandidate = "";
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 0; index < candidateCount; index++) {
    const candidate = makeCandidate(length, random);
    const score = candidateScore(candidate, sourceProfile);
    if (score < bestScore) {
      bestCandidate = candidate;
      bestScore = score;
    }
  }

  if (bestCandidate) return bestCandidate;

  const fallbackLetters = ["v", "e", "l", "o", "r", "a", "n", "i"];
  const fallback = Array.from({ length }, (_, index) => fallbackLetters[index % fallbackLetters.length]).join("");
  return fallback.toLowerCase() === source.toLowerCase() ? Array.from(fallback).reverse().join("") : fallback;
}

function scrambleDigits(source: string, random: RandomSource): string {
  return Array.from(source)
    .map((char) => {
      if (!DECIMAL_DIGIT_PATTERN.test(char)) return char;

      const codePoint = char.codePointAt(0);
      if (codePoint === undefined) return char;

      let runStart = codePoint;
      while (runStart > 0 && DECIMAL_DIGIT_PATTERN.test(String.fromCodePoint(runStart - 1))) {
        runStart--;
      }

      const original = (codePoint - runStart) % 10;
      const zero = codePoint - original;
      const offset = 1 + Math.floor(random() * 9);
      return String.fromCodePoint(zero + ((original + offset) % 10));
    })
    .join("");
}

export function scrambleText(input: string, options: ScrambleOptions = {}): string {
  const random = options.random ?? Math.random;
  const wordMap = new Map<string, string>();

  return input.replace(TOKEN_PATTERN, (token) => {
    if (!LETTER_PATTERN.test(token)) {
      return options.scrambleNumbers === false ? token : scrambleDigits(token, random);
    }

    const sourceCharacters = getLetterClusters(token).map(({ character }) => character);
    const normalizedToken = token.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
    const cacheKey = `${sourceCharacters.length}:${normalizedToken}`;
    let baseWord = wordMap.get(cacheKey);
    if (!baseWord) {
      baseWord = createBaseWord(sourceCharacters.join(""), random, options.candidateCount);
      wordMap.set(cacheKey, baseWord);
    }

    return restoreCombiningMarks(applyCasePattern(baseWord, sourceCharacters), token);
  });
}
