import { useCallback, useMemo, useState } from "react";

import { useCachedPromise, useFrecencySorting } from "@raycast/utils";

import { descript } from "./client";
import { onLoadError } from "./load-errors";
import type { DescriptProject } from "./types";

export type PinnedProject = { id: string; name: string };

export type ProjectSearchOptions = {
  /**
   * Project to keep visible at the top even when it doesn't match the
   * current search text. Useful for keeping a `presetProjectId` selectable
   * after the user starts typing.
   */
  initialPinned?: PinnedProject | null;
  /** Server page size. Defaults to 50. */
  pageSize?: number;
};

export type ProjectSearchResult = {
  /**
   * Frecency-sorted list: most recently/frequently selected projects first,
   * followed by anything else returned by the server. The pinned project (if
   * any) is always present, even if the current search wouldn't otherwise
   * match it.
   */
  projects: DescriptProject[];
  isLoading: boolean;
  error: Error | undefined;
  searchText: string;
  setSearchText: (text: string) => void;
  /** Manually re-fetch with the current `searchText`. */
  revalidate: () => void;
  recordSelection: (id: string) => void;
};

export function useProjectSearch(opts?: ProjectSearchOptions): ProjectSearchResult {
  const [searchText, setSearchText] = useState("");
  const [pinned, setPinned] = useState<PinnedProject | null>(opts?.initialPinned ?? null);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (search: string) => {
      const response = await descript.listProjects({
        limit: opts?.pageSize ?? 50,
        name: search.trim() || undefined,
        sort: "updated_at",
        direction: "desc",
      });
      return response.projects ?? [];
    },
    [searchText],
    {
      keepPreviousData: true,
      onError: onLoadError("Could not load projects"),
    },
  );

  // Merge the pinned project into the server list before frecency sorts it,
  // so a preset project the server didn't return for the current search is
  // still selectable (and benefits from any visit history it has).
  const merged = useMemo<DescriptProject[]>(() => {
    const list = data ?? [];
    if (pinned && !list.some((p) => p.id === pinned.id)) {
      const pin: DescriptProject = { id: pinned.id, name: pinned.name } as DescriptProject;
      return [pin, ...list];
    }
    return list;
  }, [data, pinned]);

  const { data: sorted, visitItem } = useFrecencySorting(merged, {
    namespace: "descript:projects",
  });

  const recordSelection = useCallback(
    (id: string) => {
      if (!id) return;
      const found = (data ?? []).find((p) => p.id === id) ?? (pinned && pinned.id === id ? pinned : null);
      if (found) {
        setPinned({ id: found.id, name: (found as DescriptProject).name ?? (found as PinnedProject).name });
        const fullProject = (data ?? []).find((p) => p.id === id);
        if (fullProject) void visitItem(fullProject);
      }
    },
    [data, pinned, visitItem],
  );

  return { projects: sorted, isLoading, error, searchText, setSearchText, revalidate, recordSelection };
}
