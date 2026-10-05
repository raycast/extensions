import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useState } from "react";

import { EntityTypeInfo } from "../api/entityTypes";
import { defaultSelection, normaliseSelection } from "../filters/catalogue";

const STORAGE_KEY = "search-entity-types";

export interface UseTypeFilter {
  selected: string[];
  toggle: (name: string) => void;
  selectOnly: (names: string[]) => void;
}

/**
 * An empty stored list was a deliberate clear and is respected; a non-empty one matching nothing
 * came from a different instance, so the default is used instead.
 */
export function reconcile(stored: string[] | null | undefined, catalogue: EntityTypeInfo[]): string[] {
  if (!stored) return defaultSelection(catalogue);
  if (stored.length === 0) return [];

  const reconciled = normaliseSelection(stored, catalogue);
  return reconciled.length > 0 ? reconciled : defaultSelection(catalogue);
}

export function useTypeFilter(catalogue: EntityTypeInfo[]): UseTypeFilter {
  const [override, setOverride] = useState<string[] | null>(null);

  const { data } = useCachedPromise(
    async () => {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (!stored) return null;
      try {
        const parsed: unknown = JSON.parse(stored);
        if (!Array.isArray(parsed)) return null;
        return parsed.filter((entry): entry is string => typeof entry === "string");
      } catch {
        return null;
      }
    },
    [],
    { initialData: null },
  );

  const stored = override ?? data;
  const selected = reconcile(stored, catalogue);

  const commit = useCallback(
    (next: string[]) => {
      const cleaned = normaliseSelection(next, catalogue);
      setOverride(cleaned);
      void LocalStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    },
    [catalogue],
  );

  return {
    selected,
    toggle: (name: string) =>
      commit(selected.includes(name) ? selected.filter((entry) => entry !== name) : [...selected, name]),
    selectOnly: commit,
  };
}
