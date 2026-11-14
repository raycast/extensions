import { LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { readdir, stat, unlink } from "fs/promises";
import path from "path";
import { useCallback, useEffect, useRef } from "react";
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

async function readEntries(): Promise<Entry[]> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

/** Deletes images no entry points at any more, including ones left behind by a failed capture. */
async function removeUnusedImages(entries: Entry[], held: Set<string>) {
  const used = new Set(entries.map((entry) => entry.image));
  const names = await readdir(imageDirectory).catch(() => [] as string[]);
  for (const name of names) {
    const file = path.join(imageDirectory, name);
    if (used.has(file) || held.has(file)) continue;
    // A capture that is being translated right now has no entry yet.
    const info = await stat(file).catch(() => undefined);
    if (info && Date.now() - info.mtimeMs > 10 * 60 * 1000) await discardImage(file);
  }
}

/**
 * The translation history. Every change is written to storage first and shown only once the
 * write succeeded; a failed write throws and leaves both storage and the list as they were.
 */
export function useHistory() {
  const { data, isLoading, error, mutate, revalidate } = usePromise(readEntries, [], {
    failureToastOptions: { title: "Couldn’t Load the History" },
  });

  // Images that a translation in progress still needs, so deleting their entry keeps the file.
  const held = useRef(new Set<string>());
  // Changes run one after another, each on top of what the previous one stored.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    if (data) void removeUnusedImages(data, held.current);
  }, [data === undefined]);

  const update = useCallback(
    (change: (entries: Entry[]) => Entry[]) => {
      const run = queue.current.then(async () => {
        const before = await readEntries();
        const next = change(before);
        await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        await mutate(Promise.resolve(), { optimisticUpdate: () => next, shouldRevalidateAfter: false });

        const kept = new Set(next.map((entry) => entry.image));
        const dropped = before.filter(
          (entry) => entry.image && !kept.has(entry.image) && !held.current.has(entry.image),
        );
        await Promise.all(dropped.map((entry) => discardImage(entry.image)));
      });
      queue.current = run.catch(() => undefined);
      return run;
    },
    [mutate],
  );

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

  /** Keeps `image` on disk until the returned function is called, whatever happens to its entry. */
  const hold = useCallback((image: string | undefined) => {
    if (!image) return () => undefined;
    held.current.add(image);
    return () => {
      held.current.delete(image);
    };
  }, []);

  return { entries: data, isLoading, error, revalidate, add, remove, clear, hold };
}
