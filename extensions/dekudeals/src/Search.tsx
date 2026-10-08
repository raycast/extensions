import { ActionPanel, Action, showToast, Toast, Icon, Grid, Color } from "@raycast/api";
import { AbortError } from "node-fetch";
import { useState, useEffect, useRef, useCallback } from "react";
import Details from "./Details";
import { performSearch, Deal } from "./networking";
import { getEntryURL } from "./util";

interface SearchState {
  results: Deal[];
  query: string;
  isLoading: boolean;
}

const useSearch = () => {
  const [state, setState] = useState<SearchState>({
    results: [],
    query: "",
    isLoading: false,
  });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      if (searchText == "") {
        setState((oldState) => ({
          ...oldState,
          results: [],
          query: searchText,
          isLoading: false,
        }));
        return;
      }

      setState((oldState) => ({
        ...oldState,
        query: searchText,
        isLoading: true,
      }));
      try {
        const results = await performSearch(searchText, cancelRef.current.signal);
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

        if (error instanceof AbortError) {
          return;
        }

        console.error("search error", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Could not perform search",
          message: String(error),
        });
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
};

const DealGridItem = ({ deal }: { deal: Deal }) => (
  <Grid.Item
    title={deal.name}
    content={{ value: deal.image ?? Icon.QuestionMark, color: Color.SecondaryText }}
    actions={
      <ActionPanel>
        <ActionPanel.Section>
          <Action.Push title="Show Details" icon={Icon.Sidebar} target={Details(deal)} />
          <Action.OpenInBrowser url={getEntryURL(deal)} shortcut={{ modifiers: ["cmd"], key: "enter" }} />
        </ActionPanel.Section>
      </ActionPanel>
    }
  />
);

const Command = (): JSX.Element => {
  const { state, search } = useSearch();

  return (
    <Grid isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search DekuDeals..." throttle>
      {state.results.map((deal) => (
        <DealGridItem key={deal.name} deal={deal} />
      ))}
      <Grid.EmptyView
        title={
          state.query.length < 3
            ? "Search for something (min. 3 characters)"
            : state.isLoading
            ? "Loading..."
            : "No results"
        }
      />
    </Grid>
  );
};

export default Command;
