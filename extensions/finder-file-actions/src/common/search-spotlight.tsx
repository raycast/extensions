import { getPreferenceValues } from "@raycast/api";
import * as React from "react";
import { runAppleScript } from "run-applescript";
import fs from "fs";
import path from "path";

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

// Helper function to normalize path for consistent comparison
function normalizePath(inputPath: string): string {
  // Remove trailing slashes and normalize case for comparison
  return inputPath.replace(/\/+$/, "").toLowerCase();
}

// A simpler function to get system folder paths
const getSystemFolderPaths = async (): Promise<Map<string, string>> => {
  try {
    // Simple script that just returns paths
    const script = `
      set folderPaths to ""
      
      tell application "Finder"
        set desktopPath to POSIX path of (path to desktop folder)
        set documentPath to POSIX path of (path to documents folder)
        set downloadPath to POSIX path of (path to downloads folder)
        set picturePath to POSIX path of (path to pictures folder)
        set musicPath to POSIX path of (path to music folder)
        set moviePath to POSIX path of (path to movies folder)
        
        set folderPaths to desktopPath & "," & documentPath & "," & downloadPath & "," & picturePath & "," & musicPath & "," & moviePath
      end tell
      
      return folderPaths
    `;

    const result = await runAppleScript(script);
    const paths = result.split(",");

    // Create a map of folder type to path
    const folderMap = new Map<string, string>();
    const folderTypes = ["desktop", "documents", "downloads", "pictures", "music", "movies"];

    for (let i = 0; i < Math.min(paths.length, folderTypes.length); i++) {
      folderMap.set(folderTypes[i], paths[i].trim());
    }

    return folderMap;
  } catch (error) {
    console.error("Error getting system folder paths:", error);
    return new Map();
  }
};

const searchSpotlight = (
  search: string,
  searchScope: string,
  abortable: React.MutableRefObject<AbortController | null | undefined> | undefined,
  callback: (results: SpotlightSearchResult[]) => void
): Promise<void> => {
  const { maxResults } = getPreferenceValues<SpotlightSearchPreferences>();
  const isExactSearch = search.startsWith("[") && search.endsWith("]");

  // Track paths we've already added to prevent duplicates
  const addedPaths = new Set<string>();
  // Collect all results before calling callback
  const allResults: SpotlightSearchResult[] = [];

  return new Promise((resolve, reject) => {
    const spotlightSearchAttributes: string[] = folderSpotlightSearchAttributes;

    // For system folders, we'll search both the display name and the path
    const searchFilter = isExactSearch
      ? ["kMDItemContentType=='public.folder'", `kMDItemDisplayName == '${search.replace(/[[|\]]/gi, "")}'`]
      : [
          "kMDItemContentType=='public.folder'",
          `(kMDItemDisplayName = "*${search}*"cd || kMDItemPath = "*${search}*"cd)`,
        ];

    let resultsCount = 0;

    // Check for system folder matches
    const lowerSearch = search.toLowerCase();
    const systemFolderTypes = ["desktop", "documents", "downloads", "pictures", "music", "movies"];

    // Only attempt to get system folders if the search might match one of them
    const mightMatchSystemFolder = systemFolderTypes.some(
      (type) => type.includes(lowerSearch) || lowerSearch.includes(type)
    );

    // If the search might match a system folder, try to get those first
    // as they should have higher priority than regular search results
    if (mightMatchSystemFolder) {
      getSystemFolderPaths()
        .then((folderMap) => {
          // Check each folder to see if it matches the search
          for (const [folderType, folderPath] of folderMap.entries()) {
            if (folderType.includes(lowerSearch) || lowerSearch.includes(folderType)) {
              // Only add if the path exists and we haven't added it yet
              if (fs.existsSync(folderPath)) {
                const normalizedPath = normalizePath(folderPath);
                if (!addedPaths.has(normalizedPath)) {
                  const stats = fs.statSync(folderPath);
                  // Use the last path component as a fallback name
                  const folderName = path.basename(folderPath);

                  const result: SpotlightSearchResult = {
                    path: folderPath,
                    kMDItemFSName: folderName,
                    kMDItemDisplayName: folderName,
                    kMDItemKind: "Folder",
                    kMDItemFSSize: 0,
                    kMDItemFSCreationDate: stats.birthtime,
                    kMDItemContentModificationDate: stats.mtime,
                    kMDItemLastUsedDate: stats.atime,
                    kMDItemUseCount: 0,
                  };

                  addedPaths.add(normalizedPath);
                  resultsCount++;
                  allResults.push(result);

                  // If we've hit the max results, we're done
                  if (resultsCount >= maxResults) {
                    callback(allResults);
                    resolve();
                    return;
                  }
                }
              }
            }
          }

          // Continue with regular Spotlight search
          spotlight(search, safeSearchScope(searchScope), searchFilter, spotlightSearchAttributes as [], abortable)
            .on("data", (result: SpotlightSearchResult) => {
              // Skip duplicates - only add if path not already added
              const normalizedPath = normalizePath(result.path);
              if (!addedPaths.has(normalizedPath)) {
                addedPaths.add(normalizedPath);

                if (resultsCount < maxResults) {
                  resultsCount++;
                  allResults.push(result);
                } else if (resultsCount >= maxResults) {
                  abortable?.current?.abort();
                  callback(allResults);
                  resolve();
                }
              }
            })
            .on("error", (e: Error) => {
              reject(e);
            })
            .on("end", () => {
              callback(allResults);
              resolve();
            });
        })
        .catch((error) => {
          console.error("Error processing system folders:", error);
          // Continue with regular Spotlight search even if system folders fail
          spotlight(search, safeSearchScope(searchScope), searchFilter, spotlightSearchAttributes as [], abortable)
            .on("data", (result: SpotlightSearchResult) => {
              // Skip duplicates - only add if path not already added
              const normalizedPath = normalizePath(result.path);
              if (!addedPaths.has(normalizedPath)) {
                addedPaths.add(normalizedPath);

                if (resultsCount < maxResults) {
                  resultsCount++;
                  allResults.push(result);
                } else if (resultsCount >= maxResults) {
                  abortable?.current?.abort();
                  callback(allResults);
                  resolve();
                }
              }
            })
            .on("error", (e: Error) => {
              reject(e);
            })
            .on("end", () => {
              callback(allResults);
              resolve();
            });
        });
    } else {
      // If no system folder matches, just do regular Spotlight search
      spotlight(search, safeSearchScope(searchScope), searchFilter, spotlightSearchAttributes as [], abortable)
        .on("data", (result: SpotlightSearchResult) => {
          // Skip duplicates - only add if path not already added
          const normalizedPath = normalizePath(result.path);
          if (!addedPaths.has(normalizedPath)) {
            addedPaths.add(normalizedPath);

            if (resultsCount < maxResults) {
              resultsCount++;
              allResults.push(result);
            } else if (resultsCount >= maxResults) {
              abortable?.current?.abort();
              callback(allResults);
              resolve();
            }
          }
        })
        .on("error", (e: Error) => {
          reject(e);
        })
        .on("end", () => {
          callback(allResults);
          resolve();
        });
    }
  });
};

export { searchSpotlight };
