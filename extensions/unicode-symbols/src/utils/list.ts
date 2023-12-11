import type { Character, Dataset } from "@/lib/dataset-manager";

export interface CharacterSet {
  sectionTitle: string;
  items: Character[];
}

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
): CharacterSet[] {
  const datasetListSections = dataset.blocks.map((block) => {
    const items: Character[] = dataset.characters.filter(
      (character) => block.startCode <= character.code && block.endCode >= character.code,
    );
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
            dataset.characters.find((character) => character.code === recentlyUsedCharacter.code),
          ),
    });
  }
  // We're sorting the sections by their lowest score to make sure the most relevant sections are displayed first.
  datasetListSections.sort((a, b) => a.lowestScore - b.lowestScore);
  return datasetListSections;
}
