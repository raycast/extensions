import { useMemo } from "react";
import type { Character } from "@/types";
import { encodeSVG, numberToHex, upperCaseFirst } from "@/lib/character-formatting";

/**
 * Hook for character formatting with memoization
 * @param character Character to format
 * @returns Formatted character data
 */
export const useCharacterFormatting = (character: Character) => {
  return useMemo(() => {
    const hex = numberToHex(character.c);
    const unicodeEscape = `\\u${hex}`;
    const htmlDecimal = `&#${character.c};`;

    // Get cached SVG encodings
    const lightSvg = encodeSVG(character.v, false);
    const darkSvg = encodeSVG(character.v, true);

    return {
      hex,
      unicodeEscape,
      htmlDecimal,
      lightSvg,
      darkSvg,
      formattedName: upperCaseFirst(character.n),
      formattedAliases: character.a.map(upperCaseFirst),
    };
  }, [character.c, character.v, character.n, character.a]);
};
