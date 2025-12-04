import { ActionPanel, Action, List, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { HowLongToBeatService, HowLongToBeatEntry } from "howlongtobeat";
import { Details } from "./details";
import { pluralize } from "./helpers";
import { HltbSearch } from "./hltbsearch";

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
  const url = `${HltbSearch.DETAIL_URL}${searchResult.id}`;
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
        const searchTerms = searchText.split(" ");

        const hltb = new HltbSearch();
        const searchResult = await hltb.search(searchTerms);

        const hltbEntries = new Array<HowLongToBeatEntry>();

        for (const resultEntry of searchResult.data) {
          hltbEntries.push(
            new HowLongToBeatEntry(
              "" + resultEntry.game_id, // game id is now a number, but I want to keep the model stable
              resultEntry.game_name,
              "", // no description
              resultEntry.profile_platform ? resultEntry.profile_platform.split(", ") : [],
              HltbSearch.IMAGE_URL + resultEntry.game_image,
              [
                ["Main", "Main"],
                ["Main + Extra", "Main + Extra"],
                ["Completionist", "Completionist"],
              ],
              Math.round(resultEntry.comp_main / 3600),
              Math.round(resultEntry.comp_plus / 3600),
              Math.round(resultEntry.comp_100 / 3600),
              HowLongToBeatService.calcDistancePercentage(resultEntry.game_name, searchText),
              searchText,
            ),
          );
        }

        setState((oldState) => ({
          ...oldState,
          results: hltbEntries,
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
    [setState],
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
