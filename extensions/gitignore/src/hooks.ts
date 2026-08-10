import fetch, { FetchError } from "node-fetch";
import fs, { readdir } from "fs/promises";
import fsSync from "fs";
import { resolve, parse, basename } from "path";
import { environment, getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { pipeline } from "stream/promises";
import { useCallback, useEffect, useState } from "react";
import { GitignoreFile, Preferences, State } from "./types";
import AdmZip from "adm-zip";

const GITHUB_URL = "https://codeload.github.com/github/gitignore/zip/main";

// Temporary zip file download
const ZIP_PATH = resolve(environment.supportPath, "download.zip");
// Extracted directory for the GitHub repository
const EXTRACTED_PATH = resolve(environment.supportPath, "gitignore-main");

// Directory with gitignore files
const LATEST_FOLDER_NAME = "latest";
const LATEST_PATH = resolve(environment.supportPath, LATEST_FOLDER_NAME);

class UpdateError extends Error {
  constructor(msg: string) {
    super(msg);

    Object.setPrototypeOf(this, UpdateError.prototype);
  }
}

async function updateCache() {
  // Get the latest main branch from the gitignore repo
  const response = await fetch(GITHUB_URL);

  if (response.body === null) {
    throw new UpdateError("No data returned. Please try again later.");
  }

  // Write this to a file (remove if partial download previously)
  await fs.rm(ZIP_PATH, { force: true });
  await pipeline(response.body, fsSync.createWriteStream(ZIP_PATH));

  try {
    // Extract to directory (remove if exists already)
    await fs.rm(EXTRACTED_PATH, { recursive: true, force: true });
    // Use adm-zip for cross-platform ZIP extraction
    const zip = new AdmZip(ZIP_PATH);
    zip.extractAllTo(environment.supportPath, true);
  } catch (error) {
    throw new UpdateError(`Could not unzip. Please file a bug report. ${error}`);
  }

  // Successfully downloaded, now replace previous cache if exists
  await fs.rm(LATEST_PATH, { recursive: true, force: true });
  await fs.rm(ZIP_PATH);
  await fs.rename(EXTRACTED_PATH, LATEST_PATH);

  await LocalStorage.setItem("last-updated", new Date().getTime());
}

// Adapted from https://stackoverflow.com/a/45130990/5724251
async function loadGitignoreFiles(dir: string): Promise<GitignoreFile[]> {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = resolve(dir, dirent.name);
      if (dirent.isDirectory()) {
        return loadGitignoreFiles(res);
      } else {
        const parsedPath = parse(res);
        // Include if a .gitiginore file
        if (parsedPath.ext === ".gitignore") {
          const folderName = basename(parsedPath.dir);
          const folder = folderName == LATEST_FOLDER_NAME ? undefined : folderName;
          return {
            id: res,
            name: parsedPath.name,
            path: res,
            folder,
          };
        }
      }
      return [];
    }),
  );
  return files.flat();
}

// Custom hook to manage favorites with LocalStorage persistence
function useFavorites(): [Set<string>, (gitignoreFile: GitignoreFile) => void] {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Load favorites from LocalStorage on mount
  useEffect(() => {
    LocalStorage.getItem<string>("favorites")
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as string[];
            setFavorites(new Set(parsed));
          } catch (error) {
            console.error("Failed to parse favorites:", error);
          }
        }
      })
      .catch((error) => {
        console.error("Failed to load favorites:", error);
      });
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback((gitignore: GitignoreFile) => {
    setFavorites((prevFavorites) => {
      const newFavorites = new Set(prevFavorites);
      if (newFavorites.has(gitignore.id)) {
        newFavorites.delete(gitignore.id);
      } else {
        newFavorites.add(gitignore.id);
      }
      // Persist to LocalStorage
      LocalStorage.setItem("favorites", JSON.stringify(Array.from(newFavorites))).catch((error) => {
        console.error("Failed to save favorites:", error);
      });
      return newFavorites;
    });
  }, []);

  return [favorites, toggleFavorite];
}

export function useGitignore(): [
  state: State,
  selected: Set<string>,
  toggleSelection: (gitignoreFile: GitignoreFile) => void,
  refresh: () => void,
  favorites: Set<string>,
  toggleFavorite: (gitignoreFile: GitignoreFile) => void,
  selectMultiple: (gitignoreFiles: GitignoreFile[]) => void,
] {
  const [state, setState] = useState<State>({ gitignoreFiles: [], loading: true, lastUpdated: null });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [favorites, toggleFavorite] = useFavorites();

  const refresh = useCallback(async (shouldDownload: boolean) => {
    // Start loading
    setState((prev) => ({ ...prev, loading: true }));

    // Determine if we need to download based on parameter and file existence
    let needsDownload = shouldDownload;
    if (!needsDownload) {
      try {
        await fs.access(LATEST_PATH);
      } catch (error) {
        needsDownload = true;
        console.error(`Could not access ${LATEST_PATH}.`, error);
      }
    }

    try {
      if (needsDownload) {
        // Download and process files
        await updateCache();
        // After files downloaded, reset selection
        setSelected(new Set());
        await showToast({
          title: "Successfully downloaded gitignore files",
        });
      }
      // Create list of Gitignore files
      const gitignoreFiles = await loadGitignoreFiles(LATEST_PATH);
      const lastUpdated = (await LocalStorage.getItem("last-updated")) as number | null;
      // Update state
      setState({
        gitignoreFiles,
        lastUpdated: lastUpdated ? new Date(lastUpdated) : null,
        loading: false,
      });
    } catch (error) {
      let message = "Unknown error occurred";
      if (error instanceof FetchError) {
        message = "Please check your internet connection and try again";
      } else if (error instanceof Error) {
        message = error.message;
      }
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to refresh",
        message,
      });
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  // Toggle selection of a GitIgnoreFile
  const toggleSelection = useCallback((gitignore: GitignoreFile) => {
    setSelected((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(gitignore.id)) {
        newSelected.delete(gitignore.id);
      } else {
        newSelected.add(gitignore.id);
      }
      return newSelected;
    });
  }, []);

  // Select multiple GitIgnoreFiles at once (for batch operations)
  const selectMultiple = useCallback((gitignoreFiles: GitignoreFile[]) => {
    setSelected((prevSelected) => {
      const newSelected = new Set(prevSelected);
      gitignoreFiles.forEach((file) => {
        newSelected.add(file.id);
      });
      return newSelected;
    });
  }, []);

  // Load files on first call
  useEffect(() => {
    refresh(false);
  }, [refresh]);

  return [state, selected, toggleSelection, () => refresh(true), favorites, toggleFavorite, selectMultiple];
}

export function useListDetailPreference(): boolean {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.listdetail;
}

export function useAutoSelectPreference(): boolean {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.autoselect;
}
