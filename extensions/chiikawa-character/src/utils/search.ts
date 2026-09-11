import { CATEGORY_LABELS } from "../data/characters";
import { ChiikawaCharacter } from "../types/character";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "their",
  "often",
  "character",
  "characters",
  "chiikawa",
]);

function extractKeywordsFromText(input: string): string[] {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .split(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf]+/g)
        .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
    ),
  );
}

export function getCharacterKeywords(character: ChiikawaCharacter): string[] {
  return [
    character.nameJp,
    character.nameRomanized,
    CATEGORY_LABELS[character.category],
    character.category,
    ...character.personality,
    ...character.funFacts,
    ...(character.catchphrases ?? []),
    ...extractKeywordsFromText(character.description),
    ...character.relationships.flatMap((item) => [item.character, item.description]),
  ];
}

export function sortCharacters(characters: ChiikawaCharacter[], sortBy: "name-en" | "name-jp"): ChiikawaCharacter[] {
  return [...characters].sort((a, b) => {
    if (sortBy === "name-jp") {
      return a.nameJp.localeCompare(b.nameJp, "ja");
    }
    return a.nameEn.localeCompare(b.nameEn, "en");
  });
}
