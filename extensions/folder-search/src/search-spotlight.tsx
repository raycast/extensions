import { getPreferenceValues } from "@raycast/api";
import * as React from "react";

import spotlight from "./libs/node-spotlight";
import { SpotlightSearchPreferences, SpotlightSearchResult } from "./types";
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
  "kMDItemUseCount",
];

const searchSpotlight = (
  search: string,
  searchScope: string,
  abortable: React.MutableRefObject<AbortController | null | undefined> | undefined,
  callback: (result: SpotlightSearchResult) => void
): Promise<void> => {
  const { maxResults } = getPreferenceValues<SpotlightSearchPreferences>();

  const isExactSearch = search.startsWith("[") && search.endsWith("]");

  return new Promise((resolve, reject) => {
    const spotlightSearchAttributes: string[] = folderSpotlightSearchAttributes;
    const searchFilter = isExactSearch
      ? ["kMDItemKind==Folder", `kMDItemDisplayName == '${search.replace(/[[|\]]/gi, "")}'`]
      : ["kind:folder"];

    let resultsCount = 0;

    // folder hard-coded into search
    spotlight(
      search,
      isExactSearch,
      safeSearchScope(searchScope),
      searchFilter,
      spotlightSearchAttributes as [],
      abortable
    )
      .on("data", (result: SpotlightSearchResult) => {
        if (resultsCount < maxResults) {
          // keep emitting the match and
          // incr resultsCount (since a folder was found)
          resultsCount++;
          callback(result);
        } else if (resultsCount >= maxResults) {
          // bail/abort on results >= maxResults
          abortable?.current?.abort();

          // allow results to stabilize via usePromise()
          // for onData()
          setTimeout(() => {
            resolve();
          }, 0);
        }

        // keep searching...
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
