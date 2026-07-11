import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MediaState } from "./interfaces";
import { filterContent, sortByAlphabet } from "./utils";
import fs from "fs";
import { Logger } from "../api/logger/logger.service";
import { getNotesFromCache, invalidateNotesCache, setNotesInCache } from "../api/cache/cache.service";
import { parseExcludedFoldersPreferences } from "../api/preferences/preferences.service";
import { SearchNotePreferences } from "./preferences";
import { Vault, Obsidian, Note, ObsidianVault } from "../obsidian";

const logger = new Logger("Hooks");

/**
 * Gets notes with caching. Checks cache first, falls back to disk scan.
 */
export async function getNotesWithCache(vaultPath: string): Promise<Note[]> {
  // Try cached
  const cached = getNotesFromCache(vaultPath);
  if (cached) {
    return cached;
  }

  // Cache miss, load from disk
  logger.info(`Cache miss for ${vaultPath}, loading from disk`);
  const { configFileName } = getPreferenceValues();
  const pref = getPreferenceValues<SearchNotePreferences>();
  const excludedFolders = parseExcludedFoldersPreferences(pref.excludedFolders);

  const notes = await Vault.getNotes(vaultPath, configFileName, excludedFolders);

  // Store in cache for next time
  setNotesInCache(vaultPath, notes);

  return notes;
}

export function useNotes(vault: ObsidianVault, bookmarked = false) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load notes with caching
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const loadedNotes = await getNotesWithCache(vault.path);
        if (!cancelled) setNotes(loadedNotes);
      } catch (error) {
        logger.error(`Error loading notes. ${error}`);
        if (!cancelled) setNotes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [vault.path, refreshKey]);

  // Refresh function to force reload
  const refresh = useCallback(() => {
    logger.info(`Refreshing notes for vault ${vault.name}`);
    invalidateNotesCache(vault.path);
    setRefreshKey((k) => k + 1);
  }, [vault]);

  // Update a single note in the list
  const updateNote = useCallback((notePath: string, updates: Partial<Note>) => {
    logger.info(`Updating note in list: ${notePath}`);
    setNotes((prev) => prev.map((note) => (note.path === notePath ? { ...note, ...updates } : note)));
  }, []);

  // Delete a note from the list
  const deleteNote = useCallback((notePath: string) => {
    setNotes((prev) => prev.filter((note) => note.path !== notePath));
  }, []);

  const filtered = useMemo(() => (bookmarked ? notes.filter((n) => n.bookmarked) : notes), [notes, bookmarked]);

  return { notes: filtered, loading, refresh, updateNote, deleteNote } as const;
}

export function useMedia(vault: ObsidianVault) {
  const [media, setMedia] = useState<MediaState>({
    ready: false,
    media: [],
  });

  useEffect(() => {
    async function fetch() {
      if (!media.ready) {
        try {
          await fs.promises.access(vault.path + "/.");

          const { configFileName } = getPreferenceValues();
          const pref = getPreferenceValues<SearchNotePreferences>();
          const excludedFolders = parseExcludedFoldersPreferences(pref.excludedFolders);
          const media = (await Vault.getMedia(vault.path, configFileName, excludedFolders)).sort((m1, m2) =>
            sortByAlphabet(m1.title, m2.title)
          );

          setMedia({ ready: true, media });
        } catch (error) {
          showToast({
            title: "The path set in preferences doesn't exist",
            message: "Please set a valid path in preferences",
            style: Toast.Style.Failure,
          });
        }
      }
    }
    fetch();
  }, []);

  return media;
}

export interface ObsidianVaultsState {
  ready: boolean;
  vaults: ObsidianVault[];
}

export function useObsidianVaults(): ObsidianVaultsState {
  const pref = useMemo(() => getPreferenceValues(), []);
  const [state, setState] = useState<ObsidianVaultsState>(() => {
    // Lazy initializer - only runs once
    if (pref.vaultPath) {
      return {
        ready: true,
        vaults: Obsidian.getVaultsFromPreferences(),
      };
    }
    return { ready: false, vaults: [] };
  });

  useEffect(() => {
    if (!pref.vaultPath) {
      Obsidian.getVaultsFromObsidianJson()
        .then((vaults) => {
          setState({ vaults, ready: true });
        })
        .catch(() => setState({ vaults: Obsidian.getVaultsFromPreferences(), ready: true }));
    }
  }, []);

  return state;
}

/** Reads the file content for a note if enabled is set to true and exposes a loading state */
export function useNoteContent(note: Note, options = { enabled: true }) {
  const [noteContent, setNoteContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!options.enabled) return;
    setIsLoading(true);
    Vault.readMarkdown(note.path, filterContent)
      .then((content) => {
        setNoteContent(content);
      })
      .catch(() => {
        logger.debug("Failed to load note content.");
        setNoteContent(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [note, options.enabled]);
  return { noteContent, isLoading };
}

/**
 * Global cache for vault plugin check results.
 * Key format: "vaultPaths|communityPlugins|corePlugins"
 */
const vaultPluginCheckCache = new Map<
  string,
  {
    vaultsWithPlugin: ObsidianVault[];
    vaultsWithoutPlugin: ObsidianVault[];
  }
>();

/**
 * Memoized hook for checking vault plugins.
 * Results are cached globally based on vault paths and required plugins to prevent duplicate checks and logging.
 */
export function useVaultPluginCheck(params: {
  vaults: ObsidianVault[];
  communityPlugins?: string[];
  corePlugins?: string[];
}) {
  return useMemo(() => {
    const cacheKey = JSON.stringify({
      vaultPaths: params.vaults.map((v) => v.path),
      communityPlugins: params.communityPlugins || [],
      corePlugins: params.corePlugins || [],
    });

    // Check cache first
    const cached = vaultPluginCheckCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - perform the check
    const result = Vault.checkPlugins(params);
    const resultObject = {
      vaultsWithPlugin: result[0],
      vaultsWithoutPlugin: result[1],
    };

    // Store in cache
    vaultPluginCheckCache.set(cacheKey, resultObject);

    return resultObject;
  }, [params.vaults.map((v) => v.path).join(","), params.communityPlugins?.join(","), params.corePlugins?.join(",")]);
}
