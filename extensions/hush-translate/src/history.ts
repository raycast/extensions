import { LocalStorage } from "@raycast/api";
import { readdir, stat, unlink } from "fs/promises";
import path from "path";
import { useCallback, useEffect, useRef, useState } from "react";
import { imageDirectory } from "./engine";

export type Source = "input" | "clipboard" | "selection" | "screenshot";

export interface Entry {
  id: string;
  createdAt: string;
  original: string;
  translation: string;
  from: string;
  to: string;
  source: Source;
  /** The image the original was read from, when it came through OCR. */
  image?: string;
}

const STORAGE_KEY = "entries";
const MAX_ENTRIES = 50;

/** Deletes a captured image. Paths outside our own image folder are left alone. */
export async function discardImage(file: string | undefined) {
  if (file && path.dirname(path.resolve(file)) === imageDirectory) await unlink(file).catch(() => undefined);
}

/** Deletes images no entry points at any more, including ones left behind by a failed capture. */
async function removeUnusedImages(entries: Entry[]) {
  const used = new Set(entries.map((entry) => entry.image));
  const names = await readdir(imageDirectory).catch(() => [] as string[]);
  for (const name of names) {
    const file = path.join(imageDirectory, name);
    if (used.has(file)) continue;
    // A capture that is being translated right now has no entry yet.
    const info = await stat(file).catch(() => undefined);
    if (info && Date.now() - info.mtimeMs > 10 * 60 * 1000) await discardImage(file);
  }
}

async function load(): Promise<Entry[]> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function useHistory() {
  const [entries, setEntries] = useState<Entry[]>();
  const current = useRef<Entry[]>([]);
  const loading = useRef<Promise<void>>(undefined);

  useEffect(() => {
    loading.current = load().then((loaded) => {
      current.current = loaded;
      setEntries(loaded);
      void removeUnusedImages(loaded);
    });
  }, []);

  /** Applies a change on top of the stored entries, waiting for them to load first. */
  const update = useCallback(async (change: (entries: Entry[]) => Entry[]) => {
    await loading.current;
    const next = change(current.current);
    const dropped = current.current.filter((entry) => entry.image && !next.some((kept) => kept.image === entry.image));
    current.current = next;
    setEntries(next);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    await Promise.all(dropped.map((entry) => discardImage(entry.image)));
  }, []);

  /** Adds an entry on top; translating the same text into the same language again replaces the old one. */
  const add = useCallback(
    (entry: Entry) =>
      update((all) =>
        [entry, ...all.filter((old) => old.original !== entry.original || old.to !== entry.to)].slice(0, MAX_ENTRIES),
      ),
    [update],
  );
  const remove = useCallback((id: string) => update((all) => all.filter((entry) => entry.id !== id)), [update]);
  const clear = useCallback(() => update(() => []), [update]);

  return { entries, add, remove, clear };
}
