import fs from "fs";
import path from "path";
import { Character, getBlocks, getCharacters } from "unidata";

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

// Run the dataset generation.
(function generateDataset() {
  const filteredBlocks = allBlocks.filter((block) => blockNamesToFilter.includes(block.blockName));

  const characters = filteredBlocks.flatMap((block) => {
    return getCharactersByCodeRange(block.startCode, block.endCode)
      .filter(Boolean) // Include only valid characters
      .filter((char) => char.name !== "<control>") // Exclude invisible control characters
      .map((char) => ({ value: String.fromCodePoint(char.code), code: char.code, name: char.name }));
  });

  const dataset = { blocks: filteredBlocks, characters };

  fs.writeFileSync(datasetOutputPath, JSON.stringify(dataset));

  console.log(`✅ Dataset with ${dataset.characters.length} unicode characters generated in ${datasetOutputPath}`);
})();
