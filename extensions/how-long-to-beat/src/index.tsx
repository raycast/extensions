import { ActionPanel, Action, List, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { HowLongToBeatService, HowLongToBeatEntry } from "howlongtobeat";
import { Details } from "./details";
import { pluralize } from "./helpers";

const hltbService = new HowLongToBeatService();

export const baseUrl = "https://howlongtobeat.com/game?id=";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search games..." throttle>
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: HowLongToBeatEntry }) {
  const url = `${baseUrl}${searchResult.id}`;
  const { push } = useNavigation();

  const mainStoryHours = searchResult.gameplayMain || 0;
  const mainStoryText = mainStoryHours >= 1 ? `${searchResult.gameplayMain} ${pluralize(mainStoryHours, "hour")}` : "-";

  return (
    <List.Item
      title={searchResult.name}
      accessoryTitle={`Main Story: ${mainStoryText}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Show Details"
              icon={Icon.Sidebar}
              onAction={() => push(<Details id={searchResult.id} name={searchResult.name} />)}
            />
            <Action.OpenInBrowser title="Open in Browser" url={url} />
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "." }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });

  const search = useCallback(
    async function search(searchText: string) {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));

      try {
        const results = await hltbService.search(searchText);

        setState((oldState) => ({
          ...oldState,
          results: results,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        console.error("search error", error);
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [setState]
  );

  useEffect(() => {
    search("");
  }, []);

  return {
    state: state,
    search: search,
  };
}

interface SearchState {
  results: HowLongToBeatEntry[];
  isLoading: boolean;
}
