import { ActionPanel, Action, List, showToast, Toast, Icon, getPreferenceValues } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search trending repos..."
      throttle
    >
      {state.results.map((searchResult, index) => (
        <SearchListItem key={searchResult.repo_id} searchResult={searchResult} index={index} />
      ))}
    </List>
  );
}

function SearchListItem({ searchResult, index }: { searchResult: Repository; index: number }) {
  return (
    <List.Item
      title={`#${index + 1} ${searchResult.repo_name}`}
      subtitle={searchResult.description ?? ""}
      accessories={[
        searchResult.language
          ? {
              icon: Icon.Code,
              text: searchResult.language,
              tooltip: "Language",
            }
          : {},
        {
          icon: Icon.Star,
          text: searchResult.stars + "",
          tooltip: "Stars",
        },
        {
          icon: Icon.Shuffle,
          text: searchResult.forks + "",
          tooltip: "Forks",
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Analyze" url={`https://ossinsight.io/analyze/${searchResult.repo_name}`} />
            <Action.OpenInBrowser title="Visit Repo" url={`https://github.com/${searchResult.repo_name}`} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Command">
            <Action.CopyToClipboard
              title="Copy SSH Clone Command"
              content={`git clone git@github.com:${searchResult.repo_name}`}
            />
            <Action.CopyToClipboard
              title="Copy HTTP Clone Command"
              content={`git clone https://github.com/${searchResult.repo_name}`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(text: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const results = await performSearch(text, cancelRef.current.signal);
        setState((oldState) => ({
          ...oldState,
          results: results,
          isLoading: false,
        }));
      } catch (err) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(err) });
      }
    },
    [cancelRef, setState]
  );

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return {
    state: state,
    search: search,
  };
}

const trendingReposURL = "https://api.ossinsight.io/q/trending-repos";

async function performSearch(searchText: string, signal: AbortSignal): Promise<Repository[]> {
  const pref = getPreferenceValues();
  const params = {
    language: pref.language,
    period: pref.period,
  };
  const resp = await axios.get(trendingReposURL, {
    params,
    signal,
  });
  const { data } = resp.data as { data: Repository[] };
  searchText = searchText.toLowerCase();
  return data.filter(
    (repo) =>
      repo.repo_name.toLowerCase().includes(searchText) ||
      (repo.description && repo.description.toLowerCase().includes(searchText))
  );
}

interface SearchState {
  results: Repository[];
  isLoading: boolean;
}

export interface Repository {
  collection_names: any;
  contributor_logins: string;
  description: string | null;
  forks: number;
  language: string | null;
  pull_requests: number;
  pushes: any;
  repo_id: number;
  repo_name: string;
  stars: number;
  total_score: number;
}
