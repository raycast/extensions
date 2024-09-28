import fs from "fs";
import path from "path";
import type { Character } from "unidata16";
import { CharacterSetType, getCharacterBaseSet, getCharacters } from "unidata16";

import type { BlockExtra, CharAlias, Character as JSONCharacter } from "../src/types";

// Output path for the generated dataset.
const datasetOutputPath = path.resolve(__dirname, "../assets/dataset.json");

// To avoid hitting memory limits, we retrieve only a subset of the unicode characters (mainly common symbols).
// Only characters part of these blocks will be included in the output.
// See https://jrgraphix.net/r/Unicode for the full list of avilable names.
const Blocks = [
  CharacterSetType.Basic_Latin,
  CharacterSetType.Latin_1_Supplement,
  CharacterSetType.Latin_Extended_A,
  CharacterSetType.Latin_Extended_B,
  CharacterSetType.Latin_Extended_Additional,
  CharacterSetType.IPA_Extensions,
  CharacterSetType.Spacing_Modifier_Letters,
  CharacterSetType.Combining_Diacritical_Marks,
  CharacterSetType.Greek_and_Coptic,
  CharacterSetType.General_Punctuation,
  CharacterSetType.Superscripts_and_Subscripts,
  CharacterSetType.Currency_Symbols,
  CharacterSetType.Letterlike_Symbols,
  CharacterSetType.Number_Forms,
  CharacterSetType.Arrows,
  CharacterSetType.Mathematical_Operators,
  CharacterSetType.Enclosed_Alphanumerics,
  CharacterSetType.Geometric_Shapes,
  CharacterSetType.Miscellaneous_Symbols,
  CharacterSetType.Dingbats,
  CharacterSetType.Supplemental_Arrows_A,
  CharacterSetType.Braille_Patterns,
  CharacterSetType.Supplemental_Arrows_B,
  CharacterSetType.Miscellaneous_Mathematical_Symbols_A,
  CharacterSetType.Miscellaneous_Mathematical_Symbols_B,
  CharacterSetType.Supplemental_Mathematical_Operators,
  CharacterSetType.Miscellaneous_Symbols_and_Arrows,
  CharacterSetType.Mathematical_Alphanumeric_Symbols,
  CharacterSetType.Miscellaneous_Technical,
  CharacterSetType.Private_Use_Area,
  CharacterSetType.Box_Drawing,
  CharacterSetType.Block_Elements,
  CharacterSetType.Emoticons,
  CharacterSetType.Ancient_Symbols,
];

const blocks = getCharacterBaseSet(Blocks) as BlockExtra[];
const allCharacters = getCharacters(Blocks);

const charCodeToAliases: CharAlias = {
  8313: ["superscript 9"],
  8984: ["cmd", "command"],
  9166: ["enter"],
  9003: ["delete"],
  94: ["control", "ctrl"],
};

// Grab unicode blocks and characters using https://github.com/chbrown/unidata/
const allBlocks = blocks.map((block) => {
  // We're adding some extra characters to the "Superscripts and Subscripts" block because they reside in a different block (Latin-1 Supplement).
  if (block.blockName === "Superscripts and Subscripts") {
    block.extra = [178, 179, 185];
  }

  return block;
});

console.log(`ℹ️ Found ${allBlocks.length} unicode blocks and ${allCharacters.length} unicode characters`);

// Map all unicode characters by code.
const allCharactersByCode = allCharacters.reduce<{ [charCode: string]: Character }>((previousValue, currentValue) => {
  previousValue[currentValue.code] = currentValue;
  return previousValue;
}, {});

/**
 * Returns unicode characters in the given range.
 * @param startCode Characters range start.
 * @param endCode Characters range end.
 * @returns Unicode characters in the given range.
 */
function getCharactersByCodeRange(startCode: number, endCode: number) {
  const characters: Character[] = [];
  for (let i = startCode; i <= endCode; i++) {
    characters.push(allCharactersByCode[i]);
  }
  return characters;
}

// Some symbols don't have a proper name set in the unicode database.
const unicodeToNameMap: Record<number, string> = { 63743: "APPLE LOGO" };
const mapCodeToName = (char: Character): Character => {
  return {
    ...char,
    name: unicodeToNameMap[char.code] || char.name,
  };
};

function mapCharacterToDatasetItem(char: Character): JSONCharacter | undefined {
  const aliases = charCodeToAliases[char.code] ? charCodeToAliases[char.code] : [];
  if (char.code)
    return {
      value: String.fromCodePoint(char.code),
      code: char.code,
      name: char.name,
      old_name: char.oldName || "",
      aliases: aliases,
    };
}

function sanitizeCharacters(characters: Character[]): JSONCharacter[] {
  return characters
    .filter(Boolean) // Include only valid characters
    .map(mapCodeToName)
    .map(mapCharacterToDatasetItem)
    .filter((char) => char && char.name !== "<control>" && char.code !== 57344) as JSONCharacter[]; // Exclude invisible control characters and private use area character
}

// Run the dataset generation.
(function generateDataset() {
  const characters = allBlocks.flatMap((block) => {
    return sanitizeCharacters(getCharactersByCodeRange(block.startCode, block.endCode));
  });

  const dataset = {
    blocks: allBlocks,
    characters,
  };

  fs.writeFileSync(datasetOutputPath, JSON.stringify(dataset, null, 2));

  console.log(`✅ Dataset with ${dataset.characters.length} unicode characters generated in ${datasetOutputPath}`);
})();
