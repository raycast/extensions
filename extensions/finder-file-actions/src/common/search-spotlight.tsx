import { getPreferenceValues } from "@raycast/api";
import * as React from "react";

import spotlight from "../libs/node-spotlight";
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
  "kMDItemContentType",
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

    // Add additional filter to search for paths containing the search term
    // This helps find system folders regardless of localization
    const searchFilter = isExactSearch
      ? ["kMDItemContentType=='public.folder'", `kMDItemDisplayName == '${search.replace(/[[|\]]/gi, "")}'`]
      : [
          "kMDItemContentType=='public.folder'",
          `(kMDItemDisplayName = "*${search}*"cd || kMDItemPath = "*${search}*"cd)`,
        ];

    // Continue with existing spotlight search
    let resultsCount = 0;
    spotlight(search, safeSearchScope(searchScope), searchFilter, spotlightSearchAttributes as [], abortable)
      .on("data", (result: SpotlightSearchResult) => {
        if (resultsCount < maxResults) {
          resultsCount++;
          callback(result);
        } else if (resultsCount >= maxResults) {
          abortable?.current?.abort();
          setTimeout(() => {
            resolve();
          }, 0);
        }
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
