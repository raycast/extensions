import { LocalStorage } from "@raycast/api";
import { CharacterData } from "./types.js";
export { lookupCharacter, CharacterNotFoundError } from "./api.js";

export const favoriteCharacterPrefix = "favorite-character";

// Keep existing favorite keys and profiles, but do not reuse the old provider's rankings.
const readCharacter = (value: string): CharacterData => {
  const character = JSON.parse(value) as CharacterData;
  if (character.Source !== "nexon") {
    character.GlobalRanking = undefined;
    character.ClassRank = undefined;
    character.ServerRank = undefined;
    character.LegionRank = undefined;
  }
  return character;
};

export const hasCharacterInFavorites = async (character: CharacterData) => {
  return Boolean(await LocalStorage.getItem([favoriteCharacterPrefix, character.Region, character.Name].join("-")));
};

export const getFavoriteCharacter = async (region: string, characterName: string) => {
  const character = await LocalStorage.getItem<string>([favoriteCharacterPrefix, region, characterName].join("-"));
  return character ? readCharacter(character) : undefined;
};

export const saveCharacterToFavorites = async (character: CharacterData, force?: boolean) => {
  if (!force && (await hasCharacterInFavorites(character))) return;
  await LocalStorage.setItem(
    [favoriteCharacterPrefix, character.Region, character.Name].join("-"),
    JSON.stringify(character),
  );
};

export const removeCharacterFromFavorites = async (character: CharacterData) => {
  await LocalStorage.removeItem([favoriteCharacterPrefix, character.Region, character.Name].join("-"));
};

export const getFavoriteCharacters = async () => {
  const all = await LocalStorage.allItems();
  const favoriteCharacters = Object.entries(all)
    .filter(([key]) => key.startsWith(favoriteCharacterPrefix))
    .map(([, value]) => readCharacter(value));
  return favoriteCharacters;
};

export const sortCharacters = (characters: CharacterData[], sortBy: string) => {
  return characters.slice().sort((c1, c2) => {
    if (sortBy === "Level") return c2.Level - c1.Level;
    if (sortBy === "Name") return c1.Name.localeCompare(c2.Name);
    return 0;
  });
};
