import { useState, useEffect } from "react";
import { getSelectedFinderItems } from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import type { FinderSelectionInfo } from "../types";

/**
 * Analyzes Finder selection and returns information for UI decision making.
 * Determines available options and suggested paths.
 */
async function analyzeFinderSelection(finderItems: Array<{ path: string }>): Promise<FinderSelectionInfo | null> {
  if (finderItems.length === 0) return null;

  const paths = finderItems.map((item) => item.path);
  const pathStats = await Promise.all(
    paths.map(async (p) => {
      try {
        const stats = await fs.stat(p);
        return { path: p, isDirectory: stats.isDirectory() };
      } catch {
        return { path: p, isDirectory: false };
      }
    }),
  );

  const directories = pathStats.filter((item) => item.isDirectory);
  const files = pathStats.filter((item) => !item.isDirectory);

  let suggestedDirectory: string;
  let directoryName: string | undefined;

  if (directories.length > 0) {
    // If we have directories, use the first one
    suggestedDirectory = directories[0].path;
    directoryName = path.basename(suggestedDirectory);
  } else if (files.length > 0) {
    // Find common parent directory for files
    if (files.length === 1) {
      suggestedDirectory = path.dirname(files[0].path);
    } else {
      // Find common parent directory for multiple files
      const parentDirs = files.map((f) => path.dirname(f.path));
      let commonParent = parentDirs[0];

      for (let i = 1; i < parentDirs.length; i++) {
        // Split paths into segments for proper comparison
        const currentSegments = parentDirs[i].split(path.sep);
        const commonSegments = commonParent.split(path.sep);

        const minSegments = Math.min(currentSegments.length, commonSegments.length);
        const sharedSegments: string[] = [];

        for (let j = 0; j < minSegments; j++) {
          if (currentSegments[j] === commonSegments[j]) {
            sharedSegments.push(currentSegments[j]);
          } else {
            break;
          }
        }

        commonParent = sharedSegments.join(path.sep);
      }

      suggestedDirectory = commonParent || path.dirname(files[0].path);
    }
  } else {
    return null;
  }

  return {
    hasFiles: files.length > 0,
    hasDirectories: directories.length > 0,
    selectedFiles: files.map((f) => f.path),
    suggestedDirectory,
    fileNames: files.map((f) => path.basename(f.path)),
    directoryName,
  };
}

/**
 * Hook to handle Finder selection detection and analysis.
 * Returns Finder selection info and all selected paths.
 */
export function useFinderSelection() {
  const [finderSelectionInfo, setFinderSelectionInfo] = useState<FinderSelectionInfo | null>(null);
  const [finderSelectedPaths, setFinderSelectedPaths] = useState<string[]>([]);

  useEffect(() => {
    async function initializeFinderPath() {
      try {
        const finderItems = await getSelectedFinderItems();
        if (finderItems.length > 0) {
          console.log(
            `Found ${finderItems.length} Finder selection(s):`,
            finderItems.map((i) => i.path),
          );

          const selectionInfo = await analyzeFinderSelection(finderItems);
          if (selectionInfo) {
            // Save all selected paths from Finder
            const allSelectedPaths = finderItems.map((item) => item.path);
            // Verify the suggested directory is actually a directory
            const stats = await fs.stat(selectionInfo.suggestedDirectory);
            if (stats.isDirectory()) {
              setFinderSelectedPaths(allSelectedPaths);
              setFinderSelectionInfo(selectionInfo);
              console.log("Analyzed Finder selection:", selectionInfo, "All paths:", allSelectedPaths);
              return; // Successfully found and set Finder path.
            }
          }

          console.log("Could not determine suitable directory from Finder selection");
        } else {
          console.log("No initial Finder selection (empty array returned).");
        }
      } catch (error) {
        const typedError = error as Error;
        if (typedError.message?.includes("Finder isn't the frontmost application")) {
          console.log("Finder not frontmost or no selection, proceeding to manual selection.");
        } else {
          console.error("Error during initial Finder path retrieval:", typedError.message || error);
        }
      }
    }
    initializeFinderPath();
  }, []); // Empty dependency array ensures this runs only once on mount.

  return {
    finderSelectionInfo,
    finderSelectedPaths,
    setFinderSelectionInfo,
    setFinderSelectedPaths,
  };
}
