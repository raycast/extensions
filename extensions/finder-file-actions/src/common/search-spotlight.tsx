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

// normalize path for consistent comparison during deduplication
function normalizePath(inputPath: string): string {
  return inputPath.replace(/\/+$/, "").toLowerCase();
}

// returns results via Promise (no callback) to keep usePromise deps stable
export const searchSpotlight = (
  search: string,
  searchScope: string,
  abortable: React.MutableRefObject<AbortController | null | undefined> | undefined,
): Promise<SpotlightSearchResult[]> => {
  const { maxResults } = getPreferenceValues<SpotlightSearchPreferences>();
  const isExactSearch = search.startsWith("[") && search.endsWith("]");

  // match both display name and path so localized/system folders surface naturally
  // no osascript calls - spotlight alone finds Desktop, Documents, etc.
  const searchFilter = isExactSearch
    ? ["kMDItemContentType=='public.folder'", `kMDItemDisplayName == '${search.replace(/[[|\]]/gi, "")}'`]
    : [
        "kMDItemContentType=='public.folder'",
        `(kMDItemDisplayName = "*${search}*"cd || kMDItemPath = "*${search}*"cd)`,
      ];

  return new Promise((resolve, reject) => {
    const addedPaths = new Set<string>();
    const allResults: SpotlightSearchResult[] = [];
    let resultsCount = 0;
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const stream = spotlight(
      search,
      safeSearchScope(searchScope),
      searchFilter,
      folderSpotlightSearchAttributes as [],
      abortable,
    );

    stream
      .on("data", (result: SpotlightSearchResult) => {
        // dedupe by normalized path
        const normalizedPath = normalizePath(result.path);
        if (addedPaths.has(normalizedPath)) {
          return;
        }
        addedPaths.add(normalizedPath);

        if (resultsCount < maxResults) {
          resultsCount++;
          allResults.push(result);
        } else {
          abortable?.current?.abort();
          settle(() => resolve(allResults));
        }
      })
      .on("error", (e: Error) => {
        // aborts are expected during debouncing - treat as empty result
        if (e.name === "AbortError" || e.message.includes("aborted")) {
          settle(() => resolve(allResults));
          return;
        }
        settle(() => reject(e));
      })
      .on("end", () => {
        settle(() => resolve(allResults));
      });
  });
};
