import { getPreferenceValues } from "@raycast/api";
import * as React from "react";
import spotlight from "./libs/node-spotlight";
import { SpotlightSearchResult, SpotlightSearchPreferences } from "./types";
import path from "path";
import { safeSearchScope, log } from "./utils";

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

export async function searchSpotlight(
  search: string,
  searchScope: "pinned" | "user" | "all",
  abortable?: React.MutableRefObject<AbortController | null | undefined>
): Promise<SpotlightSearchResult[]> {
  log("debug", "searchSpotlight", "Starting search with parameters", {
    search,
    searchScope,
    abortable: !!abortable?.current,
  });

  const { maxResults } = getPreferenceValues<SpotlightSearchPreferences>();
  const isExactSearch = search.startsWith("[") && search.endsWith("]");

  const searchFilter = isExactSearch
    ? ["kMDItemContentType=='public.folder'", `kMDItemDisplayName == '${search.replace(/[[|\]]/gi, "")}'`]
    : ["kMDItemContentType=='public.folder'", `kMDItemDisplayName = "*${search}*"cd`];

  log("debug", "searchSpotlight", "Generated search filter", {
    filter: searchFilter,
    isExactSearch,
    maxResults,
  });

  try {
    log("debug", "searchSpotlight", "Executing Spotlight search");

    const results = await new Promise<SpotlightSearchResult[]>((resolve, reject) => {
      const searchResults: SpotlightSearchResult[] = [];
      let resultsCount = 0;

      const searchStream = spotlight(
        search,
        safeSearchScope(searchScope),
        searchFilter,
        folderSpotlightSearchAttributes as [],
        abortable
      );

      searchStream.on("data", (result: SpotlightSearchResult) => {
        if (resultsCount < maxResults) {
          resultsCount++;
          searchResults.push(result);
          log("debug", "searchSpotlight", "Received result", {
            resultCount: resultsCount,
            path: result.path,
          });
        } else if (resultsCount >= maxResults) {
          log("debug", "searchSpotlight", "Max results reached, aborting", {
            maxResults,
          });
          abortable?.current?.abort();
        }
      });

      searchStream.on("end", () => {
        log("debug", "searchSpotlight", "Spotlight search completed", {
          resultCount: searchResults.length,
        });
        resolve(searchResults);
      });

      searchStream.on("error", (error: Error) => {
        log("error", "searchSpotlight", "Error during search", {
          error,
          search,
          searchScope,
        });
        reject(error);
      });
    });

    const filteredResults = results
      .filter((result: SpotlightSearchResult) => {
        if (searchScope === "pinned") {
          return false;
        }
        if (searchScope === "user") {
          return result.path.startsWith("/Users/");
        }
        return true;
      })
      .map((result: SpotlightSearchResult) => ({
        ...result,
        kMDItemFSName: result.kMDItemFSName || path.basename(result.path),
      }));

    log("debug", "searchSpotlight", "Filtered results", {
      originalCount: results.length,
      filteredCount: filteredResults.length,
      searchScope,
    });

    return filteredResults;
  } catch (error) {
    log("error", "searchSpotlight", "Error during search", {
      error,
      search,
      searchScope,
    });
    throw error;
  }
}
