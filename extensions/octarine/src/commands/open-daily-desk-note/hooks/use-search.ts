import { useState } from "react";
import { useWorkspaces } from "@hooks/use-workspaces";
import { formatDateLabel, formatWeekLabel, type DateQuery } from "@lib/daily-desk";
import { ALL_WORKSPACES, type WorkspaceSection } from "@type/notes";
import type { Workspace } from "@type/octarine";
import { useLastWorkspace } from "./use-last-workspace";
import { useDailyNotes } from "./use-notes";
import { useOpenDailyNote } from "./use-open-note";

// Daily Desk command state and derived results.
export type DailyDeskSuggestion = {
  label: string;
  date: string;
  target?: Workspace;
  locked: boolean;
  sectionPath?: string;
};

export type DailyDeskSearchQuery = {
  date: DateQuery | null;
  suggestedDate?: string;
  hasExactMatch: boolean;
};

export type DailyDeskSearchWorkspace = {
  workspaces: Workspace[];
  isLoading: boolean;
  dropdown: Workspace[];
  selected: string;
  grouped: boolean;
  target?: Workspace;
};

export type DailyDeskSearchResults = {
  visibleSections: WorkspaceSection[];
  hasNotes: boolean;
  suggestion?: DailyDeskSuggestion;
  suggestionInSection: boolean;
};

export type DailyDeskSearchActions = {
  onRefresh: () => void;
  onSearchTextChange: (value: string) => void;
  onWorkspaceChange: (value: string) => void;
  openDailyNote: (date: string, workspaceName: string) => Promise<void>;
  clearLastWorkspace: () => void | Promise<void>;
  rememberWorkspace: (workspaceName: string) => Promise<void>;
};

type Options = {
  requestedWorkspace: string;
  useLastWorkspaceEnabled: boolean;
};

type Result = {
  isLoading: boolean;
  query: DailyDeskSearchQuery;
  workspace: DailyDeskSearchWorkspace;
  results: DailyDeskSearchResults;
  actions: DailyDeskSearchActions;
};

export function useDailyDeskSearch({ requestedWorkspace, useLastWorkspaceEnabled }: Options): Result {
  const [refresh, setRefresh] = useState(false);
  const [searchText, setSearchText] = useState("");
  const { workspaces, status, revalidate: revalidateWorkspaces } = useWorkspaces({ refresh });
  const {
    workspace: lastWorkspace,
    isLoading: isLastWorkspaceLoading,
    remember: rememberWorkspace,
    clear: clearLastWorkspace,
  } = useLastWorkspace({
    workspaces,
    enabled: useLastWorkspaceEnabled,
  });
  const {
    dropdown,
    sections,
    isLoading,
    revalidate: revalidateNotes,
    hasNotes,
    dateQuery,
    suggestedDate,
    hasExactMatch,
    selectedWorkspace,
    setSelectedWorkspace,
  } = useDailyNotes({
    workspaces,
    enabled: !status.isLoading,
    requestedWorkspace,
    searchText,
    refresh,
  });
  const onRefresh = () => {
    if (!refresh) {
      setRefresh(true);
      return;
    }

    void revalidateWorkspaces();
    revalidateNotes();
  };
  const openDailyNote = useOpenDailyNote({
    date: "",
    requestedWorkspace,
    workspaces,
    status,
    onWorkspaceOpened: rememberWorkspace,
    enabled: false,
  });
  const grouped = selectedWorkspace === ALL_WORKSPACES;
  const chosen = grouped ? undefined : workspaces.find((workspace) => workspace.path === selectedWorkspace);
  const targetWorkspace = chosen ?? (isLastWorkspaceLoading ? undefined : lastWorkspace);
  const suggestion: DailyDeskSuggestion | undefined =
    dateQuery && suggestedDate && !hasExactMatch
      ? {
          label: dateQuery.kind === "week" ? formatWeekLabel(suggestedDate) : formatDateLabel(suggestedDate),
          date: suggestedDate,
          target: targetWorkspace,
          locked: chosen !== undefined,
          sectionPath: grouped ? targetWorkspace?.path : undefined,
        }
      : undefined;
  const visibleSections =
    suggestion && grouped && targetWorkspace && !sections.some((section) => section.path === targetWorkspace.path)
      ? [
          ...sections,
          { name: targetWorkspace.display ?? targetWorkspace.name, path: targetWorkspace.path, notes: [] },
        ].sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path))
      : sections;
  const suggestionInSection = suggestion?.sectionPath !== undefined;

  return {
    isLoading: isLoading || status.isLoading,
    query: {
      date: dateQuery,
      suggestedDate,
      hasExactMatch,
    },
    workspace: {
      workspaces,
      isLoading: status.isLoading,
      dropdown,
      selected: selectedWorkspace,
      grouped,
      target: targetWorkspace,
    },
    results: {
      visibleSections,
      hasNotes,
      suggestion,
      suggestionInSection,
    },
    actions: {
      onRefresh,
      onSearchTextChange: setSearchText,
      onWorkspaceChange: setSelectedWorkspace,
      openDailyNote,
      clearLastWorkspace,
      rememberWorkspace,
    },
  };
}
