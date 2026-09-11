import { LocalStorage } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useCallback } from "react";
import { CaseRow, savedCaseFromRow } from "./rows";
import { SavedCase } from "./types";

const SAVED_KEY = "saved-cases";

function parseSaved(raw: string | undefined): SavedCase[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is SavedCase => typeof item?.clusterId === "number") : [];
  } catch {
    return [];
  }
}

/**
 * Saved cases outlive a search, so unlike the history they neither expire nor get capped — the
 * list only grows by a deliberate act, and losing a case you kept on purpose is the worse failure.
 */
export function useSavedCases() {
  const { value, setValue, isLoading } = useLocalStorage<SavedCase[]>(SAVED_KEY, []);
  const saved = value ?? [];

  // Every write re-reads the stored list first: the hook's copy is empty until LocalStorage
  // answers, and writing from that would drop everything saved so far.
  const toggle = useCallback(
    async (row: CaseRow) => {
      const previous = parseSaved(await LocalStorage.getItem<string>(SAVED_KEY));
      const wasSaved = previous.some((item) => item.clusterId === row.id);
      const next = wasSaved
        ? previous.filter((item) => item.clusterId !== row.id)
        : [savedCaseFromRow(row), ...previous];
      await setValue(next);
      return !wasSaved;
    },
    [setValue],
  );

  const remove = useCallback(
    async (clusterId: number) => {
      const previous = parseSaved(await LocalStorage.getItem<string>(SAVED_KEY));
      await setValue(previous.filter((item) => item.clusterId !== clusterId));
    },
    [setValue],
  );

  const isSaved = useCallback((clusterId: number) => saved.some((item) => item.clusterId === clusterId), [saved]);

  return { saved, isLoading, toggle, remove, isSaved };
}
