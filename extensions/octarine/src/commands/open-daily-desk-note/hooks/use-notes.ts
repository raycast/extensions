import { Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNoteSections } from "@hooks/use-note-sections";
import { toDailyStem, type DateQuery } from "@lib/daily-desk";
import { getDailyNotes } from "@lib/notes";
import { extensionPreferences } from "@lib/preferences";
import { findWorkspaceByName } from "@lib/workspaces";
import type { Workspace } from "@type/octarine";
import { ALL_WORKSPACES, type IndexedNote, type WorkspaceSection } from "@type/notes";
import { createDailySearch, prioritizeExactDateMatches } from "../lib/daily-search";

type Options = {
  workspaces: Workspace[];
  enabled?: boolean;
  requestedWorkspace: string;
  searchText: string;
  refresh?: boolean;
};

type Result = {
  dropdown: string[];
  sections: WorkspaceSection[];
  hasNotes: boolean;
  isLoading: boolean;
  revalidate: () => void;
  dateQuery: DateQuery | null;
  suggestedDate?: string;
  hasExactMatch: boolean;
  selectedWorkspace: string;
  setSelectedWorkspace: (workspace: string) => void;
};

export function useDailyNotes({
  workspaces,
  enabled = true,
  requestedWorkspace,
  searchText,
  refresh,
}: Options): Result {
  const preferences = extensionPreferences();
  const excludedKey = JSON.stringify([...preferences.excludedFoldersInWorkspaces].sort());
  const [selectedWorkspace, setSelectedWorkspace] = useState(ALL_WORKSPACES);
  const search = useMemo(() => createDailySearch(searchText), [searchText]);
  const {
    data: notes,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (refresh: boolean, workspaces: Workspace[], excludedKey: string): Promise<IndexedNote[]> => {
      const excludedDirectories = new Set(JSON.parse(excludedKey) as string[]);
      return getDailyNotes(workspaces, excludedDirectories, { refresh });
    },
    [refresh ?? false, workspaces, excludedKey],
    {
      execute: enabled,
      initialData: [] satisfies IndexedNote[],
      keepPreviousData: true,
      onError: async (error) => {
        console.error("Failed to scan Daily Desk notes", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Scan Daily Desk Notes",
          message: error instanceof Error ? error.message : String(error),
        });
      },
      onData: () => {
        if (refresh) {
          showToast({
            style: Toast.Style.Success,
            title: "Daily notes refreshed",
          });
        }
      },
    },
  );
  const noteSections = useNoteSections(notes, {
    selectedWorkspace,
    matches: search.matches,
  });
  const dropdown = useMemo(() => Array.from(new Set(workspaces.map((workspace) => workspace.name))), [workspaces]);
  const appliedRequestedWorkspace = useRef("");

  useEffect(() => {
    if (!enabled || !requestedWorkspace) {
      appliedRequestedWorkspace.current = "";
      return;
    }

    if (appliedRequestedWorkspace.current === requestedWorkspace) {
      return;
    }

    const workspace = findWorkspaceByName(workspaces, requestedWorkspace);
    if (!workspace) {
      return;
    }

    appliedRequestedWorkspace.current = requestedWorkspace;
    setSelectedWorkspace(workspace.name);
  }, [enabled, requestedWorkspace, workspaces]);

  const prioritized = useMemo(() => {
    if (!search.query) {
      return { sections: noteSections.sections, hasExactMatch: false };
    }

    return prioritizeExactDateMatches(noteSections.sections, search.query);
  }, [noteSections.sections, search.query]);

  return {
    dropdown,
    sections: prioritized.sections,
    hasNotes: noteSections.dropdown.length > 0,
    isLoading: !enabled || isLoading,
    revalidate,
    dateQuery: search.query,
    suggestedDate: search.query ? toDailyStem(search.query) : undefined,
    hasExactMatch: prioritized.hasExactMatch,
    selectedWorkspace,
    setSelectedWorkspace,
  };
}
