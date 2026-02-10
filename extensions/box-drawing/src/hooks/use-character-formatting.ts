import { useMemo } from "react";
import type { Character } from "@/types";
import { encodeSVG } from "@/lib/character-formatting";

/**
 * Hook for character formatting with memoization
 * @param character Character to format
 * @returns Formatted character data
 */
export const useCharacterFormatting = (character: Character) => {
  return useMemo(() => {
    // Get cached SVG encodings
    const lightSvg = encodeSVG(character.shape, false);
    const darkSvg = encodeSVG(character.shape, true);

    return {
      lightSvg,
      darkSvg,
    };
  }, [character.shape, character.name]);
};
