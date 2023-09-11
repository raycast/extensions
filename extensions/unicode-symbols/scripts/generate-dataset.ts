import fs from "fs";
import path from "path";
import { Character, getBlocks, getCharacters } from "unidata";
import { CharAlias } from "../src/dataset-manager";

// Output path for the generated dataset.
const datasetOutputPath = path.resolve(__dirname, "../assets/dataset.json");

// To avoid hitting memory limits, we retrieve only a subset of the unicode characters (mainly common symbols).
// Only characters part of these blocks will be included in the output.
// See https://jrgraphix.net/r/Unicode for the full list of avilable names.
const blockNamesToFilter = [
  "Basic Latin",
  "Latin-1 Supplement",
  "Latin Extended-A",
  "Latin Extended-B",
  "IPA Extensions",
  "Spacing Modifier Letters",
  "Combining Diacritical Marks",
  "General Punctuation",
  "Superscripts and Subscripts",
  "Currency Symbols",
  "Letterlike Symbols",
  "Number Forms",
  "Arrows",
  "Mathematical Operators",
  "Geometric Shapes",
  "Miscellaneous Symbols",
  "Dingbats",
  "Supplemental Arrows-A",
  "Braille Patterns",
  "Supplemental Arrows-B",
  "Miscellaneous Mathematical Symbols-A",
  "Supplemental Mathematical Operators",
  "Miscellaneous Symbols and Arrows",
  "Mathematical Alphanumeric Symbols",
];

// Specify here any additional characters and blocks to include in the dataset.
const additionalCharacterValues = ["", "⌘", "⌥", "⏎", "⌫"];
const additionalBlockNames = ["Miscellaneous Technical", "Private Use Area"];
const charCodeToAliases: CharAlias = {
  8313: ["superscript 9"],
  8984: ["cmd", "command"],
  9166: ["enter"],
  9003: ["delete"],
  94: ["control", "ctrl"],
};

// Grab unicode blocks and characters using https://github.com/chbrown/unidata/
const allBlocks = getBlocks();
const allCharacters = getCharacters();

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
  const characters = [];
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

function mapCharacterToDatasetItem(char: Character) {
  const aliases = charCodeToAliases[char.code] ? charCodeToAliases[char.code] : [];
  if (char.code) return { value: String.fromCodePoint(char.code), code: char.code, name: char.name, aliases: aliases };
}

function sanitizeCharacters(characters: Character[]) {
  return characters
    .filter(Boolean) // Include only valid characters
    .map(mapCodeToName)
    .map(mapCharacterToDatasetItem)
    .filter((char) => char && char.name !== "<control>"); // Exclude invisible control characters
}

// Run the dataset generation.
(function generateDataset() {
  const filteredBlocks = allBlocks.filter((block) => blockNamesToFilter.includes(block.blockName));
  const additionalBlocks = allBlocks.filter((block) => additionalBlockNames.includes(block.blockName));

  const characters = filteredBlocks.flatMap((block) => {
    return sanitizeCharacters(getCharactersByCodeRange(block.startCode, block.endCode));
  });

  const additionalCharacters = sanitizeCharacters(
    allCharacters.filter((char) => additionalCharacterValues.includes(String.fromCodePoint(char.code)))
  );

  const dataset = {
    blocks: [...filteredBlocks, ...additionalBlocks],
    characters: [...characters, ...additionalCharacters],
  };

  fs.writeFileSync(datasetOutputPath, JSON.stringify(dataset, null, 2));

  console.log(`✅ Dataset with ${dataset.characters.length} unicode characters generated in ${datasetOutputPath}`);
})();
