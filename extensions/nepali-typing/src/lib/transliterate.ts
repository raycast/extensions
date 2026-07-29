import { CONSONANTS, VOWELS_INDEP, VOWELS_MATRA, SPECIALS, HALANTA } from "./mappings";

const byLenDesc = (keys: string[]): string[] => [...keys].sort((a, b) => b.length - a.length);

const CONSONANT_KEYS: string[] = byLenDesc(Object.keys(CONSONANTS));
const VOWEL_KEYS: string[] = byLenDesc(Object.keys(VOWELS_INDEP));
const SPECIAL_KEYS: string[] = byLenDesc(Object.keys(SPECIALS));

const matchAt = (text: string, pos: number, keys: string[]): string | null => {
  for (const key of keys) {
    if (text.startsWith(key, pos)) return key;
  }
  return null;
};

export const transliterate = (input: string): string => {
  let out: string = "";
  let i: number = 0;
  let prevConsonant: boolean = false;

  while (i < input.length) {
    const special: string | null = matchAt(input, i, SPECIAL_KEYS);
    if (special !== null) {
      out += SPECIALS[special];
      i += special.length;
      prevConsonant = false;
      continue;
    }

    const cons: string | null = matchAt(input, i, CONSONANT_KEYS);
    if (cons !== null) {
      if (prevConsonant) out += HALANTA;
      out += CONSONANTS[cons];
      i += cons.length;
      prevConsonant = true;
      continue;
    }

    const vowel: string | null = matchAt(input, i, VOWEL_KEYS);
    if (vowel !== null) {
      out += prevConsonant ? VOWELS_MATRA[vowel] : VOWELS_INDEP[vowel];
      i += vowel.length;
      prevConsonant = false;
      continue;
    }

    out += input[i];
    i += 1;
    prevConsonant = false;
  }

  return out;
};
