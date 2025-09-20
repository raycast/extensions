import fs from "fs";
import Fuse from "fuse.js";

import { environment } from "@raycast/api";

import { dataSetName, searchResultLimit } from "@/lib/preferences";
import type { Character, Dataset } from "@/types";

const dataset = JSON.parse(fs.readFileSync(`${environment.assetsPath}/${dataSetName}.json`, "utf-8")) as Dataset;

// We use Fuse.js (https://fusejs.io/) to speed-up the unicode characters search.

/**
 * Returns the unicode character that exactly matches the user query.
 * @param query The user query.
 * @returns The unicode character that exactly matches the user query or null if no match is found.
 *
 * @example
 * getExactChar("A") // { code: 65, value: "A", name: "LATIN CAPITAL LETTER A", aliases: ["A"], old_name: "LATIN CAPITAL LETTER A" }
 * getExactChar("U+1F600") // { code: 128512, value: "😀", name: "GRINNING FACE", aliases: ["grinning"], old_name: "GRINNING FACE" }
 * getExactChar("128512") // { code: 128512, value: "😀", name: "GRINNING FACE", aliases: ["grinning"], old_name: "GRINNING FACE" }
 * getExactChar("0x1F600") // { code: 128512, value: "😀", name: "GRINNING FACE", aliases: ["grinning"], old_name: "GRINNING FACE" }
 * getExactChar("😀") // { code: 128512, value: "😀", name: "GRINNING FACE", aliases: ["grinning"], old_name: "GRINNING FACE" }
 */
function getExactChar(query: string): Character | null {
  if (!query || query.length === 0) {
    return null;
  }
  const dec = parseInt(query, 10);
  const hex = parseInt(query, 16);

  if (!isNaN(dec)) {
    const character = dataset.characters.find((char) => char.c === dec);
    if (character) {
      return character;
    }
  } else if (!isNaN(hex)) {
    const character = dataset.characters.find((char) => char.c === hex);
    if (character) {
      return character;
    }
  } else if (
    query.startsWith("\\u") ||
    query.startsWith("\\U") ||
    query.startsWith("U+") ||
    query.startsWith("u+") ||
    query.startsWith("0x")
  ) {
    const hex = parseInt(query.substring(2), 16);
    const character = dataset.characters.find((char) => char.c === hex);
    return character || null;
  }

  if (query.length === 1) {
    const charCode = query.charCodeAt(0);
    const character = dataset.characters.find((char) => char.c === charCode);
    if (character) {
      return character;
    }
  }

  const character = dataset.characters.find((char) => char.v === query);
  if (character) {
    return character;
  }
  return null;
}

/**
 * Returns a list of unicode characters that approximately match the user query.
 * @param query The user query.
 * @returns List of unicode characters that approximately match the user query
 */
export function getFilteredDataset(query: string | null, filter: string | null): Dataset {
  const selectedBlock = filter ? dataset.blocks.find((block) => block.blockName === filter) : null;
  const allCharacters = selectedBlock
    ? dataset.characters.filter(
        (character) =>
          (selectedBlock.startCode <= character.c && selectedBlock.endCode >= character.c) ||
          selectedBlock.extra?.includes(character.c),
      )
    : dataset.characters;

  // No need to run the search when no query is provided.
  if (!query) {
    return {
      selectedBlock: selectedBlock || null,
      blocks: dataset.blocks,
      characters: filter !== null ? allCharacters : allCharacters.slice(0, searchResultLimit),
    };
  }

  const splitQuery = query?.trim().split(" ");

  // We use Fuse.js' extended search (https://fusejs.io/examples.html#extended-search) to
  // fine-tune results.
  // Instead of going with a full-fuzzy-search approach, we return only characters
  // that have a name that include every query's word.
  const fuseSearchPattern = splitQuery.map((item) => `'${item}`).join(" ") || "";

  const fuse = new Fuse(allCharacters, {
    // keys: ["name", "aliases", "old_name"],
    keys: ["n", "s", "o"],
    useExtendedSearch: true,
    includeScore: true,
  });

  const fuseResults = fuse.search(fuseSearchPattern, { limit: searchResultLimit });
  const characters = fuseResults.map((fuseResult) => ({ ...fuseResult.item, score: fuseResult.score }));

  if (splitQuery.length === 1) {
    const char = getExactChar(splitQuery[0]);
    if (char) {
      const findItemIndex = characters.findIndex((c) => c.c === char.c);
      if (findItemIndex > -1) {
        // remove the item at findItemIndex from characters
        characters.splice(findItemIndex, 1);
      }

      characters.unshift({
        ...char,
        score: -1,
      });
    }
  }

  const hasExactMatches = characters.some((char) => char.score === -1);
  // We filter results that might come true with a score of -1 if there are more that one character. This has to do with logic regarding getting an exact character.
  const filtered =
    characters.length > 1 && hasExactMatches ? characters.filter((char) => char.score !== -1) : characters;

  return {
    selectedBlock: selectedBlock || null,
    blocks: dataset.blocks,
    characters: filtered,
  };
}
