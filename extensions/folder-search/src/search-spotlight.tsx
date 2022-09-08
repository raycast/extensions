import { getPreferenceValues } from "@raycast/api";
import * as React from "react";

import spotlight from "./libs/node-spotlight";

interface SpotlightSearchPreferences {
  name: string;
  maxResults: number;
}

import { SpotlightSearchResult } from "./types";

import { safeSearchScope } from "./utils";

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
  searchFilter: string,
  abortable: React.MutableRefObject<AbortController | null | undefined> | undefined,
  callback: (result: SpotlightSearchResult) => void
): Promise<void> => {
  const { maxResults } = getPreferenceValues<SpotlightSearchPreferences>();

  return new Promise((resolve, reject) => {
    const spotlightSearchAttributes: string[] = folderSpotlightSearchAttributes;
    let resultsCount = 0;

    // folder hard-coded into search
    spotlight(search, safeSearchScope(searchScope), searchFilter, spotlightSearchAttributes as [], abortable)
      .on("data", (result: SpotlightSearchResult) => {
        if (resultsCount < maxResults) {
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
      .on("error", (e: Error) => {
        reject(e);
      })
      .on("end", () => {
        resolve();
      });
  });
};

export { searchSpotlight };
