import Fuse from "fuse.js";
import { searchResultLimit } from "./consants";
import { environment } from "@raycast/api";
import fs from "fs";

export interface Dataset {
  blocks: Block[];
  characters: Character[];
}

export interface Character {
  code: number;
  value: string;
  name: string;
}

export interface Block {
  blockName: string;
  startCode: number;
  endCode: number;
}

const dataset = JSON.parse(fs.readFileSync(`${environment.assetsPath}/dataset.json`, "utf-8")) as Dataset;

// We use Fuse.js (https://fusejs.io/) to speed-up the unicode characters search.
const fuse = new Fuse(dataset.characters, { keys: ["name"], useExtendedSearch: true });

/**
 * Returns a list of unicode characters that approximately match the user query.
 * @param query The user query.
 * @returns List of unicode characters that approximately match the user query
 */
export function getFilteredDataset(query?: string) {
  const filteredDataset: Dataset = {
    blocks: dataset.blocks,
    characters: [],
  };
  // No need to run the search when no query is provided.
  if (!query) {
    filteredDataset.characters = dataset.characters.slice(0, searchResultLimit);
  } else {
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
    filteredDataset.characters = fuseResults.map((fuseResult) => fuseResult.item);
  }

  return filteredDataset;
}
