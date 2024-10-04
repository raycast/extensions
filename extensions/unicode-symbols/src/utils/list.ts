import type { Character, CharacterSection, Dataset } from "@/types";

/**
 * Maps an unicode characters dataset + the list of recently used characters to a section list
 * to populate the Raycast list.
 * @param dataset A (filtered) unicode characters dataset
 * @param recentlyUsedCharacters List of recently used unicode characters
 * @param isFilterEmpty Is the search filter empty?
 * @returns List of unicode characters to populate the Raycast list
 */
export function buildList(
  dataset: Dataset,
  recentlyUsedCharacters: Character[],
  isFilterEmpty: boolean,
  datasetFilter: string | null,
): CharacterSection[] {
  const datasetListSections = dataset.blocks
    .filter((block) => !dataset.selectedBlock || block.blockName === dataset.selectedBlock.blockName)
    .map((block) => {
      const items: Character[] = dataset.characters
        .filter(
          (character) =>
            (block.startCode <= character.c && block.endCode >= character.c) || block.extra?.includes(character.c),
        )
        .map((character) => {
          if (block.extra?.includes(character.c)) {
            return {
              ...character,
              isExtra: true,
            };
          }
          return character;
        });
      const lowestScore = items.reduce((acc, item) => Math.min(acc, item.score || 1), 1);
      return {
        sectionTitle: block.blockName,
        lowestScore,
        items,
      };
    });
  if (recentlyUsedCharacters.length && !datasetFilter) {
    datasetListSections.unshift({
      sectionTitle: "Recently Used",
      lowestScore: 0,
      items: isFilterEmpty
        ? recentlyUsedCharacters
        : recentlyUsedCharacters.filter((recentlyUsedCharacter) =>
            dataset.characters.find((character) => character.c === recentlyUsedCharacter.c),
          ),
    });
  }
  // We're sorting the sections by their lowest score to make sure the most relevant sections are displayed first.
  datasetListSections.sort((a, b) => a.lowestScore - b.lowestScore);
  return datasetListSections;
}
