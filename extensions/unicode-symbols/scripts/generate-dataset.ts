import fs from "fs/promises";
import path from "path";
import type { Character } from "unidata16";
import { CharacterSetType, getCharacterBaseSet, getCharacters } from "unidata16";

import type { BlockExtra, CharAlias, Character as JSONCharacter } from "../src/types";

// To avoid hitting memory limits, we retrieve only a subset of the unicode characters (mainly common symbols).
// Only characters part of these blocks will be included in the output.
// See https://jrgraphix.net/r/Unicode for the full list of avilable names.

const AllBlocks = Object.values(CharacterSetType);

const FilteredBlocks = [
  CharacterSetType.Basic_Latin,
  CharacterSetType.Latin_1_Supplement,
  CharacterSetType.Latin_Extended_A,
  CharacterSetType.Latin_Extended_B,
  CharacterSetType.Latin_Extended_C,
  CharacterSetType.Latin_Extended_D,
  CharacterSetType.Latin_Extended_E,
  CharacterSetType.Latin_Extended_F,
  CharacterSetType.Latin_Extended_G,
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
  CharacterSetType.Phonetic_Extensions,
  CharacterSetType.Supplemental_Punctuation,
];

const allCharacters = getCharacters(AllBlocks);

const getBlocks = (blocks: BlockExtra[]): BlockExtra[] => {
  return blocks.map((block) => {
    if (block.blockName === "Superscripts and Subscripts") {
      block.extra = [178, 179, 185];
    }

    return block;
  });
};

// Map all unicode characters by code.
const allCharactersByCode = allCharacters.reduce<{ [charCode: string]: Character }>((previousValue, currentValue) => {
  previousValue[currentValue.code] = currentValue;
  return previousValue;
}, {});

// Some symbols don't have a proper name set in the unicode database.
const mapCodeToName = (char: Character): Character => {
  const unicodeToNameMap: Record<number, string> = { 63743: "APPLE LOGO" };

  return { ...char, name: unicodeToNameMap[char.code] || char.name };
};

function mapCharacterToDatasetItem(char: Character): JSONCharacter | undefined {
  const charCodeToAliases: CharAlias = {
    8313: ["superscript 9"],
    8984: ["cmd", "command"],
    9166: ["enter"],
    9003: ["delete"],
    94: ["control", "ctrl"],
  };

  const aliases = charCodeToAliases[char.code] ? charCodeToAliases[char.code] : [];

  if (char.code)
    return {
      v: String.fromCodePoint(char.code), // value
      c: char.code, // code
      n: char.name, // name
      o: char.oldName || "", // old name
      a: aliases,
    };
}

/**
 * Returns unicode characters in the given range.
 * @param startCode Characters range start.
 * @param endCode Characters range end.
 * @returns Unicode characters in the given range.
 */
function getCharactersByCodeRange(startCode: number, endCode: number): JSONCharacter[] {
  const characters: Character[] = [];
  for (let i = startCode; i <= endCode; i++) {
    if (allCharactersByCode[i]) {
      characters.push(allCharactersByCode[i]);
    }
  }

  return characters
    .filter(Boolean) // Include only valid characters
    .map(mapCodeToName)
    .map(mapCharacterToDatasetItem)
    .filter((char) => char && char.n !== "<control>" && char.c !== 57344) as JSONCharacter[]; // Exclude invisible control characters and private use area character
}

// Extra characters to add to the dataset.
const extraCharacters: JSONCharacter[] = [{ v: "\t", c: 9, n: "CHARACTER TABULATION", o: "", a: [] }];

// Run the dataset generation.
const generateDataset = async (sets: CharacterSetType[], fileName: string) => {
  const blocks = getCharacterBaseSet(sets) as BlockExtra[];
  const allBlocks = getBlocks(blocks);

  console.log(`ℹ️ Found ${allBlocks.length} unicode blocks and ${allCharacters.length} unicode characters`);

  const characters = allBlocks.flatMap((block) => {
    return getCharactersByCodeRange(block.startCode, block.endCode);
  });

  const dataset = { blocks: allBlocks, characters: [...extraCharacters, ...characters] };

  const datasetOutputPath = path.resolve(__dirname, `../assets/${fileName}.json`);
  await fs.writeFile(datasetOutputPath, JSON.stringify(dataset));

  console.log(`✅ Dataset with ${dataset.characters.length} unicode characters generated in ${datasetOutputPath}`);
};

(async () => {
  // Full dataset generation
  await generateDataset(AllBlocks, "full-dataset");
  // Filtered dataset generation
  await generateDataset(FilteredBlocks, "dataset");
})();
