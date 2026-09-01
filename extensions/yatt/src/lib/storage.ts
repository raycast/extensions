import { launchCommand, LaunchType, LocalStorage, showToast, Toast } from "@raycast/api";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { useCallback, useEffect, useState } from "react";
import { loadLocationsFile, saveLocationsFile, type LocationsFile, type StorageBackend } from "../core/store";
import type { Location } from "../core/types";
import { loadSeed } from "./data";
import { getPrefs } from "./prefs";

const KEY = "locations-v1";

const localBackend: StorageBackend = {
  read: () => LocalStorage.getItem<string>(KEY),
  write: (text) => LocalStorage.setItem(KEY, text),
};

/** Expands a leading "~" or "~/" to the home directory; other paths resolve as absolute. */
export function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return path.join(homedir(), p.slice(2));
  return path.resolve(p);
}

function fileBackend(file: string): StorageBackend {
  const full = expandHome(file.trim());
  return {
    read: async () => (existsSync(full) ? readFileSync(full, "utf8") : undefined),
    write: async (text) => {
      // Write to a sibling file and rename, so a crash or a sync collision never leaves a torn file.
      mkdirSync(path.dirname(full), { recursive: true });
      const tmp = `${full}.${process.pid}.tmp`;
      writeFileSync(tmp, text, "utf8");
      renameSync(tmp, full);
    },
  };
}

export function currentBackend(): { backend: StorageBackend; file?: string } {
  const f = getPrefs().locationsFile?.trim();
  return f ? { backend: fileBackend(f), file: expandHome(f) } : { backend: localBackend };
}

export async function readLocations(): Promise<LocationsFile> {
  return loadLocationsFile(currentBackend().backend, loadSeed());
}

/** Saves the list and refreshes the menu bar; returns the menu bar's error text if it could not be refreshed. */
export async function writeLocations(file: LocationsFile): Promise<string | undefined> {
  await saveLocationsFile(currentBackend().backend, file);
  return refreshMenuBar();
}

/**
 * Re-runs the menu bar command so its title reflects the list. Returns Raycast's error text when it refuses,
 * which happens while the command is disabled or has never been run: a menu bar command appears only after its
 * first launch.
 */
export async function refreshMenuBar(): Promise<string | undefined> {
  try {
    await launchCommand({ name: "menu-bar-clock", type: LaunchType.Background });
    return undefined;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.log(`menu bar refresh failed: ${message}`);
    return message;
  }
}

export type LocationsUpdate = Partial<LocationsFile> | ((current: LocationsFile) => Partial<LocationsFile>);

// All writes go through one chain: each read-modify-write sees the previous one's result.
let chain: Promise<unknown> = Promise.resolve();

export function useLocations() {
  const [file, setFile] = useState<LocationsFile>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    let active = true;
    readLocations()
      .then((f) => active && setFile(f))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      active = false;
    };
  }, []);

  /** Applies an update to the freshly read file. Shows a toast and rethrows when the write fails. */
  const save = useCallback(async (update: LocationsUpdate): Promise<string | undefined> => {
    const run = async () => {
      const current = await readLocations();
      const merged: LocationsFile = { ...current, ...(typeof update === "function" ? update(current) : update) };
      const menuBarError = await writeLocations(merged);
      setFile(merged);
      return menuBarError;
    };
    const result = chain.then(run, run);
    chain = result.catch(() => undefined);
    try {
      return await result;
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save locations",
        message: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  }, []);

  const setLocations = useCallback((locations: Location[]) => save({ locations }), [save]);
  return { file, locations: file?.locations, isLoading: !file && !error, error, save, setLocations };
}
