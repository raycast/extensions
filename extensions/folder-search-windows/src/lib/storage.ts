import { useLocalStorage } from "@raycast/utils";
import { useCallback, useMemo } from "react";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** A persisted, de-duplicated list of folder paths (pinned or recent). */
export function useFolderList(key: "pinned" | "recent", limit?: number) {
  const { value, setValue, isLoading } = useLocalStorage<string[]>(key, []);
  const items = useMemo(() => value ?? [], [value]);

  const has = useCallback((p: string) => items.some((i) => same(i, p)), [items]);

  const add = useCallback(
    async (p: string) => {
      const next = [p, ...items.filter((i) => !same(i, p))];
      await setValue(limit ? next.slice(0, limit) : next);
    },
    [items, limit, setValue],
  );

  const remove = useCallback(async (p: string) => setValue(items.filter((i) => !same(i, p))), [items, setValue]);

  const move = useCallback(
    async (p: string, delta: -1 | 1) => {
      const idx = items.findIndex((i) => same(i, p));
      const target = idx + delta;
      if (idx < 0 || target < 0 || target >= items.length) return;
      const next = [...items];
      [next[idx], next[target]] = [next[target], next[idx]];
      await setValue(next);
    },
    [items, setValue],
  );

  const clear = useCallback(async () => setValue([]), [setValue]);

  return { items, has, add, remove, move, clear, isLoading };
}

export type FolderList = ReturnType<typeof useFolderList>;
