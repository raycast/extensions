import { useCallback, useState } from "react";
import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { IssueListItem } from "./components/IssueListItem";
import { applySearchSuggestion } from "./utils";
import type { Command, Issue, SearchSuggestion, WorkItem } from "./interfaces";
import { YouTrackApi } from "./api/youtrack-api";
import { fetchIssueSearchResults } from "./issue-search";
import { getBrowseEmptyViewState } from "./browse-state";

interface Preferences {
  instance: string;
  token: string;
  query: string;
  maxIssues: number;
}

function fetchIssues(query: string, maxIssues: number, suppressBadRequest: boolean): Promise<Issue[]> {
  return fetchIssueSearchResults(query, maxIssues, suppressBadRequest, (issueQuery, issueLimit) =>
    YouTrackApi.getInstance().fetchIssues(issueQuery, issueLimit),
  );
}

function fetchSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
  return YouTrackApi.getInstance().fetchSearchSuggestions(query);
}

function SearchSuggestionListItem(props: {
  query: string;
  suggestion: SearchSuggestion;
  onApply: (query: string) => void;
}) {
  const completedQuery = applySearchSuggestion(props.query, props.suggestion);

  return (
    <List.Item
      icon={Icon.MagnifyingGlass}
      title={completedQuery}
      subtitle={props.suggestion.description || undefined}
      accessories={props.suggestion.group ? [{ text: props.suggestion.group }] : undefined}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.MagnifyingGlass}
            title="Apply Search Suggestion"
            onAction={() => props.onApply(completedQuery)}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const youTrackApi = YouTrackApi.getInstance();
  const [searchText, setSearchText] = useState("");
  const hasSearchText = searchText.trim().length > 0;
  const effectiveQuery = hasSearchText ? searchText : prefs.query;
  const maxIssues = Number(prefs.maxIssues);

  const {
    data: items,
    error: issuesError,
    isLoading: isLoadingIssues,
    mutate: mutateIssues,
    revalidate: revalidateIssues,
  } = useCachedPromise(fetchIssues, [effectiveQuery, maxIssues, hasSearchText], {
    initialData: [],
    keepPreviousData: true,
    failureToastOptions: { title: "Failed loading issues" },
  });

  const {
    data: fetchedSuggestions,
    error: suggestionsError,
    isLoading: isLoadingSuggestions,
    revalidate: revalidateSuggestions,
  } = useCachedPromise(fetchSearchSuggestions, [searchText], {
    execute: hasSearchText,
    initialData: [],
    failureToastOptions: { title: "Failed loading search suggestions" },
  });
  const suggestions = hasSearchText ? fetchedSuggestions : [];

  const getIssueDetails = useCallback(
    async (issue: Issue) => {
      return await youTrackApi.fetchIssueDetails(issue);
    },
    [youTrackApi],
  );

  const createWorkItemCb = useCallback(
    async (issue: Issue, workItem: WorkItem) => {
      return await youTrackApi.createWorkItem(issue, workItem);
    },
    [youTrackApi],
  );

  const applyCommandCb = useCallback(
    async (issue: Issue, command: Command) => await youTrackApi.applyCommandToIssue(issue.id, command),
    [youTrackApi],
  );

  const getCommandSuggestions = useCallback(
    async (issue: Issue, command: string) => await youTrackApi.getCommandSuggestions(issue.id, { command }),
    [youTrackApi],
  );

  const getLastCommentCb = useCallback(
    async (issueId: string) => {
      const comments = await youTrackApi.fetchComments(issueId);
      return comments.at(-1) ?? null;
    },
    [youTrackApi],
  );

  const deleteIssueCb = useCallback(
    async (issueId: string) => {
      try {
        await mutateIssues(youTrackApi.deleteIssue(issueId), {
          optimisticUpdate: (currentItems) => currentItems.filter((item) => item.id !== issueId),
          shouldRevalidateAfter: false,
        });
        showToast({
          style: Toast.Style.Success,
          title: "Issue deleted",
        });
      } catch (error) {
        console.error(error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed deleting issue",
          message: error instanceof Error ? error.message : "Something went wrong",
        });
      }
    },
    [mutateIssues, youTrackApi],
  );

  const isLoading = isLoadingIssues || (hasSearchText && isLoadingSuggestions);
  const emptyViewState = getBrowseEmptyViewState({
    hasSearchText,
    isLoading,
    issueCount: items.length,
    suggestionCount: suggestions.length,
    issuesError,
    suggestionsError,
  });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search YouTrack issues"
      filtering={false}
      throttle
    >
      {suggestions.length > 0 ? (
        <List.Section title="Search Suggestions">
          {suggestions.map((suggestion, index) => (
            <SearchSuggestionListItem
              key={`${suggestion.completionStart}-${suggestion.completionEnd}-${suggestion.option}-${index}`}
              query={searchText}
              suggestion={suggestion}
              onApply={setSearchText}
            />
          ))}
        </List.Section>
      ) : null}
      <List.Section title="Issues">
        {items.map((item, index) => (
          <IssueListItem
            key={item.id}
            item={item}
            index={index}
            instance={prefs.instance}
            resolved={item.resolved}
            getIssueDetailsCb={() => getIssueDetails(item)}
            createWorkItemCb={(workItem: WorkItem) => createWorkItemCb(item, workItem)}
            applyCommandCb={(command: Command) => applyCommandCb(item, command)}
            getCommandSuggestions={(command: string) => getCommandSuggestions(item, command)}
            getLastCommentCb={() => getLastCommentCb(item.id)}
            deleteIssueCb={() => deleteIssueCb(item.id)}
          />
        ))}
      </List.Section>
      {emptyViewState ? (
        <List.EmptyView
          icon={emptyViewState.retry ? Icon.Warning : Icon.MagnifyingGlass}
          title={emptyViewState.title}
          description={emptyViewState.description}
          actions={
            emptyViewState.retry ? (
              <ActionPanel>
                <Action
                  title="Retry"
                  onAction={emptyViewState.retry === "issues" ? revalidateIssues : revalidateSuggestions}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : null}
    </List>
  );
}
