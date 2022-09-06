import { getPreferenceValues } from "@raycast/api";

import spotlight from "node-spotlight";

interface SpotlightSearchPreferences {
  name: string;
  maxResults: number;
}

import { SpotlightSearchResult } from "./types";

import { isFolder, safeSearchScope } from "./utils";

const folderSpotlightSearchAttributes = [
  "kMDItemDisplayName",
  "kMDItemFSCreationDate",
  "kMDItemFSName",
  "kMDItemFSSize",
  "kMDItemPath",
  "kMDItemContentModificationDate",
  "kMDItemKind",
  "kMDItemLastUsedDate",
];

const searchSpotlight = (
  search: string,
  searchScope: string,
  callback: (result: SpotlightSearchResult) => void
): Promise<void> => {
  const { maxResults } = getPreferenceValues<SpotlightSearchPreferences>();

  return new Promise((resolve, reject) => {
    const spotlightSearchAttributes: string[] = folderSpotlightSearchAttributes;
    let resultsCount = 0;

    spotlight(search, safeSearchScope(searchScope), spotlightSearchAttributes)
      .on("data", (result: SpotlightSearchResult) => {
        if (isFolder(result) && resultsCount < maxResults) {
          // keep emitting the match and
          // incr resultsCount since a folder was found
          resultsCount++;
          callback(result);
        } else if (resultsCount >= maxResults) {
          // bail on results >= maxResults
          resolve();
        }

        // else keep searching...
      })
      .on("error", () => {
        reject(new Error("An error occured during your search"));
      })
      .on("end", () => {
        resolve();
      });
  });
};

export { searchSpotlight };
