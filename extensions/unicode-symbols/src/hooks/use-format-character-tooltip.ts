import type { Character } from "@/types";
import { upperCaseFirst } from "@/lib/character-formatting";
import { useCharacterFormatting } from "@/hooks/use-character-formatting";

/**
 * Format character tooltip with all relevant information
 * @param character Character to format
 * @param section Section name (optional)
 * @param filter Current filter (optional)
 * @param htmlEntity HTML entity (optional)
 * @returns Formatted tooltip string
 */
export const useFormatCharacterTooltip = (
  character: Character,
  section?: string,
  filter?: string | null,
  htmlEntity?: string | null,
): string => {
  const { formattedName, hex } = useCharacterFormatting(character);

  return [
    `Name: ${formattedName}`,
    `Dec: ${character.c}`,
    `Hex: ${hex}`,
    filter === null && typeof section !== "undefined" ? `Section: ${section}` : "",
    htmlEntity ? `HTML Entity: ${htmlEntity}` : "",
    character.a?.length ? `Aliases: "${character.a.map(upperCaseFirst).join(", ")}"` : "",
    character.u ? `Unicode Version: ${character.u}` : "",
    character.m ? `Mirror Code: ${character.m}` : "",
    ...(character.isExtra ? [" ", "> Note: This character is actually in a different Character Set"] : [""]),
  ]
    .filter((s) => s.length > 0)
    .join("\n");
};
