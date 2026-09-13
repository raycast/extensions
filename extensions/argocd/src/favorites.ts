import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";

export type FavoritesBucket = "applications" | "projects";

function storageKey(bucket: FavoritesBucket): string {
  return `argocd.favorites.${bucket}`;
}

async function readFavorites(bucket: FavoritesBucket): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(storageKey(bucket));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

async function writeFavorites(bucket: FavoritesBucket, list: string[]): Promise<void> {
  await LocalStorage.setItem(storageKey(bucket), JSON.stringify(list));
}

export function useFavorites(bucket: FavoritesBucket) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const writeQueue = useRef(Promise.resolve());

  useEffect(() => {
    readFavorites(bucket).then((list) => {
      setFavorites(new Set(list));
      setReady(true);
    });
  }, [bucket]);

  const toggle = useCallback(
    (name: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        writeQueue.current = writeQueue.current.then(() => writeFavorites(bucket, [...next]));
        return next;
      });
    },
    [bucket],
  );

  return { favorites, isFavorite: (name: string) => favorites.has(name), toggle, ready };
}
