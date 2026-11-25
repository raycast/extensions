import { VocabularyEntry } from "./types";

export function splitSpellings(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(",")
    .map((spelling) => spelling.trim())
    .filter((spelling) => {
      const key = spelling.toLowerCase();
      if (!spelling || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function vocabularyAddArgs(term: string, spellings: string[]): string[] {
  const args = ["vocabulary", "add", term];
  if (spellings.length > 0) args.push("--sounds-like", spellings.join(","));
  return args;
}

const sameSpelling = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function planVocabularyEdit(before: VocabularyEntry, term: string, spellings: string[]): string[][] {
  const old = before.sounds_like ?? [];
  const dropsSpelling = old.some((spelling) => !spellings.some((next) => sameSpelling(next, spelling)));
  if (before.term === term && !dropsSpelling) {
    const added = spellings.filter((next) => !old.some((spelling) => sameSpelling(spelling, next)));
    return added.length > 0 ? [vocabularyAddArgs(term, added)] : [];
  }
  return [["vocabulary", "remove", before.term], vocabularyAddArgs(term, spellings)];
}
