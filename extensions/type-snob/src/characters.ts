import charactersData from "./characters.json";

/**
 * Useful references:
 * - https://www.typewolf.com/cheatsheet
 * - https://www.w3.org/wiki/Common_HTML_entities_used_for_typography
 */
export interface Character {
  label: string;
  value: string;
  html: string;
  example?: string;
  keywords?: string[];
  icons?: {
    light: string;
    dark: string;
  };
}

interface CharacterSection {
  title: string;
  characters: Character[];
}

export const characterSections: CharacterSection[] = charactersData.sections;
