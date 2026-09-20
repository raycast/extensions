import { dirname } from "path";

import { createApiClient, type HttpClient, type PaperlibApiClient } from "./client";
import { DEMO_PAPERS } from "./demo-library";
import { filterPapers, loadLocalPapers, type FileSystem } from "./local-library";
import {
  DEFAULT_API_HOST,
  DEFAULT_RESULT_LIMIT,
  LibraryUnavailableError,
  type LibraryPreferences,
  type SearchResult,
} from "./types";

export interface LibraryDeps {
  http?: HttpClient;
  fs?: FileSystem;
  apiClient?: PaperlibApiClient;
  env?: NodeJS.ProcessEnv;
}

const SETUP_HINTS = [
  "Install Paperlib from https://paperlib.app and keep it running.",
  "In Paperlib → Preferences → Extensions, install @future-scholars/paperlib-apihost-extension (listens on 127.0.0.1:21227).",
  "Or point this Raycast extension at a Paperlib JSON/CSV export via Preferences.",
];

export async function searchLibrary(
  query: string,
  preferences: LibraryPreferences,
  deps: LibraryDeps = {},
): Promise<SearchResult> {
  const limit = preferences.resultLimit || DEFAULT_RESULT_LIMIT;
  const api = deps.apiClient ?? createApiClient(preferences.apiHost || DEFAULT_API_HOST, deps.http);

  if (await api.isAvailable()) {
    const papers = await api.searchPapers(query, limit);
    const appLibFolder = (await api.getPreference("appLibFolder")) || preferences.libraryFolder;
    return {
      papers: papers.slice(0, limit),
      source: "api",
      sourceLabel: `Paperlib API Host (${preferences.apiHost || DEFAULT_API_HOST})`,
      libraryFolder: appLibFolder || undefined,
    };
  }

  if (deps.fs) {
    const local = await loadLocalPapers(deps.fs, {
      file: preferences.localLibraryFile,
      folder: preferences.libraryFolder,
    });

    if (local?.realmOnly) {
      if (preferences.useDemoFallback || shouldForceDemo(deps.env)) {
        return demoResult(
          query,
          limit,
          "Paperlib Realm file found, but it cannot be opened while the app is closed. Showing demo papers.",
        );
      }
      throw new LibraryUnavailableError(
        "Found Paperlib's default.realm database, but Realm files are not readable from Raycast. Start Paperlib with the API Host extension, or export library.json.",
        SETUP_HINTS,
      );
    }

    if (local && local.papers.length > 0) {
      return {
        papers: filterPapers(local.papers, query).slice(0, limit),
        source: "local",
        sourceLabel: `Local export (${local.label})`,
        libraryFolder: preferences.libraryFolder || dirname(local.label),
      };
    }
  }

  if (preferences.useDemoFallback || shouldForceDemo(deps.env)) {
    return demoResult(query, limit, undefined, preferences.libraryFolder);
  }

  throw new LibraryUnavailableError(
    "Paperlib is not reachable. Start the app with the API Host extension, or add a JSON/CSV library export.",
    SETUP_HINTS,
  );
}

function demoResult(query: string, limit: number, label?: string, libraryFolder?: string): SearchResult {
  return {
    papers: filterPapers(DEMO_PAPERS, query).slice(0, limit),
    source: "demo",
    sourceLabel: label ?? "Demo library (Paperlib is not connected)",
    libraryFolder,
  };
}

function shouldForceDemo(env?: NodeJS.ProcessEnv): boolean {
  const value = env?.PAPERLIB_DEMO ?? process.env.PAPERLIB_DEMO;
  return value === "1" || value === "true";
}
