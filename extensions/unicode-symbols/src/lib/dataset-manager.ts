import fs from "fs";
import Fuse from "fuse.js";

import { environment } from "@raycast/api";

import { searchResultLimit } from "./preferences";

export interface Dataset {
  blocks: Block[];
  characters: Character[];
}

export interface Character {
  code: number;
  value: string;
  name: string;
  aliases: string[];
  old_name: string;
  recentlyUsed?: boolean;
  score?: number;
}

export interface Block {
  blockName: string;
  startCode: number;
  endCode: number;
}

export interface CharAlias {
  [key: number]: string[];
}

const dataset = JSON.parse(fs.readFileSync(`${environment.assetsPath}/dataset.json`, "utf-8")) as Dataset;

// We use Fuse.js (https://fusejs.io/) to speed-up the unicode characters search.
const fuse = new Fuse(dataset.characters, {
  keys: ["name", "aliases", "old_name"],
  useExtendedSearch: true,
  includeScore: true,
});

/**
 * Returns a list of unicode characters that approximately match the user query.
 * @param query The user query.
 * @returns List of unicode characters that approximately match the user query
 */
export function getFilteredDataset(query: string | null, filter: string | null): Dataset {
  const selectedBlock = filter ? dataset.blocks.find((block) => block.blockName === filter) : null;
  const allCharacters = selectedBlock
    ? dataset.characters.filter(
        (character) => selectedBlock.startCode <= character.code && selectedBlock.endCode >= character.code,
      )
    : dataset.characters;
  fuse.setCollection(allCharacters);

  // No need to run the search when no query is provided.
  if (!query) {
    return {
      blocks: dataset.blocks,
      characters: filter !== null ? allCharacters : allCharacters.slice(0, searchResultLimit),
    };
  }

  // We use Fuse.js' extended search (https://fusejs.io/examples.html#extended-search) to
  // fine-tune results.
  // Instead of going with a full-fuzzy-search approach, we return only characters
  // that have a name that include every query's word.
  const fuseSearchPattern =
    query
      ?.trim()
      .split(" ")
      .map((item) => `'${item}`)
      .join(" ") || "";

  const fuseResults = fuse.search(fuseSearchPattern, { limit: searchResultLimit });
  const characters = fuseResults.map((fuseResult) => ({ ...fuseResult.item, score: fuseResult.score }));

  return {
    blocks: dataset.blocks,
    characters,
  };
}
