export const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum',
];

export type LoremUnit = 'words' | 'sentences' | 'paragraphs';
export const LOREM_MAX_COUNT = 1000;

/** Parses the Count field: integers 1 to LOREM_MAX_COUNT; empty, zero, negative or junk becomes 1. */
export function clampLoremCount(raw: string | number): number {
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, LOREM_MAX_COUNT);
}

const pick = (rng: () => number) => LOREM_WORDS[Math.floor(rng() * LOREM_WORDS.length)];

/** 5 to 19 words, first letter capitalised, ending with a full stop. */
export function loremSentence(rng: () => number = Math.random): string {
  const n = Math.floor(rng() * 15) + 5;
  const text = Array.from({ length: n }, () => pick(rng)).join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1) + '.';
}

/** 3 to 7 sentences. */
export function loremParagraph(rng: () => number = Math.random): string {
  const n = Math.floor(rng() * 5) + 3;
  return Array.from({ length: n }, () => loremSentence(rng)).join(' ');
}

/** Exactly `count` words, sentences or paragraphs (paragraphs separated by a blank line). */
export function generateLorem(unit: LoremUnit, count: number, rng: () => number = Math.random): string {
  const n = clampLoremCount(count);
  if (unit === 'words') return Array.from({ length: n }, () => pick(rng)).join(' ');
  if (unit === 'sentences') return Array.from({ length: n }, () => loremSentence(rng)).join(' ');
  return Array.from({ length: n }, () => loremParagraph(rng)).join('\n\n');
}
