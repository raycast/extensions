import { Action, Icon, List, useNavigation } from "@raycast/api";
import { SearchNotesEmptyView } from "@components/empty-views/search-notes";
import { NotesList } from "@components/notes-list";
import { WorkspaceDropdown } from "@components/workspace-dropdown";
import { WorkspaceList } from "@components/workspace-list";
import { formatDateLabel } from "@lib/daily-desk";
import { openDailyDeskNotePreferences } from "@lib/preferences";
import { DailyNotesEmptyView } from "./empty-view";
import { DailyNoteEmptyActionPanel, DailyNoteItem, DailyNoteSuggestion } from "./notes";
import {
  type DailyDeskSearchActions,
  type DailyDeskSearchQuery,
  type DailyDeskSearchResults,
  type DailyDeskSearchWorkspace,
  useDailyDeskSearch,
} from "../hooks/use-search";

type SearchProps = {
  requestedWorkspace: string;
};

type ResultsProps = {
  query: DailyDeskSearchQuery;
  workspace: DailyDeskSearchWorkspace;
  results: DailyDeskSearchResults;
  actions: SearchActions;
  showFilename: boolean;
};

type SearchActions = DailyDeskSearchActions & {
  chooseWorkspace: (date: string) => void;
  openDate?: () => void;
};

type SearchActionOptions = {
  push: ReturnType<typeof useNavigation>["push"];
  workspace: DailyDeskSearchWorkspace;
  query: DailyDeskSearchQuery;
  actions: DailyDeskSearchActions;
};

export function DailyDeskSearch({ requestedWorkspace }: SearchProps) {
  const { push } = useNavigation();
  const preferences = openDailyDeskNotePreferences();
  const { isLoading, query, workspace, results, actions } = useDailyDeskSearch({
    requestedWorkspace,
    useLastWorkspaceEnabled: preferences.useLastWorkspace,
  });
  const viewActions = createSearchActions({ push, workspace, query, actions });

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      onSearchTextChange={viewActions.onSearchTextChange}
      searchBarPlaceholder="Search Daily Desk notes or type a date"
      searchBarAccessory={
        <WorkspaceDropdown
          sections={workspace.dropdown}
          value={workspace.selected}
          onChange={viewActions.onWorkspaceChange}
        />
      }
    >
      <DailyDeskResults
        query={query}
        workspace={workspace}
        results={results}
        actions={viewActions}
        showFilename={preferences.showFilename}
      />
    </List>
  );
}

function createSearchActions({ push, workspace, query, actions }: SearchActionOptions): SearchActions {
  const chooseWorkspace = (date: string) => {
    push(
      <WorkspaceList workspaces={workspace.workspaces} isLoading={workspace.isLoading} onRefresh={actions.onRefresh}>
        {(workspaceItem) => (
          <Action
            title="Open Daily Desk Note"
            icon={Icon.AppWindow}
            onAction={() => void actions.openDailyNote(date, workspaceItem.name)}
          />
        )}
      </WorkspaceList>,
    );
  };
  const openDate =
    query.date && query.suggestedDate
      ? () => {
          const date = query.suggestedDate;
          if (!date) {
            return;
          }

          if (workspace.target) {
            void actions.openDailyNote(date, workspace.target.name);
          } else {
            chooseWorkspace(date);
          }
        }
      : undefined;

  return { ...actions, chooseWorkspace, openDate };
}

function DailyDeskResults({ query, workspace, results, actions, showFilename }: ResultsProps) {
  const suggestionItem = results.suggestion ? (
    <DailyNoteSuggestion
      suggestion={results.suggestion}
      onOpen={actions.openDailyNote}
      onChooseWorkspace={actions.chooseWorkspace}
      onRefresh={actions.onRefresh}
      onClear={actions.clearLastWorkspace}
    />
  ) : null;
  const suggestionSection =
    suggestionItem && workspace.grouped ? (
      <List.Section title={workspace.target?.name ?? "Choose a Workspace"}>{suggestionItem}</List.Section>
    ) : (
      suggestionItem
    );
  const emptyActions = (
    <DailyNoteEmptyActionPanel hasWorkspaces={workspace.dropdown.length > 0} onRefresh={actions.onRefresh} />
  );

  return (
    <>
      {!results.suggestionInSection && !query.hasExactMatch ? suggestionSection : null}
      {results.visibleSections.length > 0 ? (
        <NotesList
          sections={results.visibleSections}
          grouped={workspace.grouped}
          renderNote={(note) => (
            <DailyNoteItem
              key={note.id}
              note={note}
              showFilename={showFilename}
              onRefresh={actions.onRefresh}
              onWorkspaceOpened={actions.rememberWorkspace}
              onOpenDate={actions.openDate}
              openDateTitle={query.suggestedDate ? `Force Open ${formatDateLabel(query.suggestedDate)}` : undefined}
            />
          )}
          renderSectionStart={
            results.suggestionInSection
              ? (section) => (section.path === results.suggestion?.sectionPath ? suggestionItem : null)
              : undefined
          }
        />
      ) : query.date ? null : !results.hasNotes ? (
        <DailyNotesEmptyView actions={emptyActions} />
      ) : (
        <SearchNotesEmptyView actions={emptyActions} />
      )}
      {!results.suggestionInSection && query.hasExactMatch ? suggestionSection : null}
    </>
  );
}
