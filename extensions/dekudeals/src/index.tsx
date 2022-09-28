import { ActionPanel, Action, List, showToast, Toast, Detail, Icon } from "@raycast/api";
import { AbortError } from "node-fetch";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  performSearch,
  Deal,
  getDetails,
  DealDetails,
  DealDetailsMetadata,
  DealDetailsPrice,
  DealDetailsDLC,
} from "./search";

interface SearchState {
  results: Deal[];
  query: string;
  isLoading: boolean;
}

interface DetailState {
  isLoading: boolean;
  fetched: boolean;
  markdown?: string;
  metadata?: JSX.Element;
}

const getEntryURL = (entry: Deal): string => `https://www.dekudeals.com${entry.url}`;

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

const dealMarkdown = (deal: Deal, details?: DealDetails): string => `
# ${deal.name}
<img src="${details?.imageURL ?? ""}" />
${details?.description ?? ""}
`;

const MetadataPriceEntry = (price: DealDetailsPrice): JSX.Element => {
  const title = price.version ? `${price.store} (${price.version})` : price.store;
  return <Detail.Metadata.Label key={price.store} title={title} text={price.price} />;
};

const MetadataEntry = (metadata: DealDetailsMetadata): JSX.Element => {
  switch (typeof metadata.value) {
    case "string": {
      const text = metadata.value as string;
      return <Detail.Metadata.Label key={metadata.key} title={metadata.key} text={text} />;
    }
    case "object": {
      const values = metadata.value as string[];
      return (
        <Detail.Metadata.TagList key={metadata.key} title={metadata.key}>
          {values.map((v) => (
            <Detail.Metadata.TagList.Item key={v} text={v} />
          ))}
        </Detail.Metadata.TagList>
      );
    }
  }
};

const MetadataDLCEntry = (dlc: DealDetailsDLC): JSX.Element => (
  <Detail.Metadata.Label key={dlc.name} title={dlc.name} text={dlc.price} />
);

const DealMetadata = (deal: Deal, details?: DealDetails): JSX.Element | undefined => {
  if (!details) return;
  return (
    <Detail.Metadata>
      {details.prices?.map((p) => MetadataPriceEntry(p))}
      <Detail.Metadata.Separator />
      {details.metadata?.map((m) => MetadataEntry(m))}
      <Detail.Metadata.Separator />
      {details.dlcs?.map((d) => MetadataDLCEntry(d))}
    </Detail.Metadata>
  );
};

const Details = (deal: Deal): JSX.Element => {
  const [state, setState] = useState<DetailState>({
    isLoading: true,
    fetched: false,
  });
  if (!state.fetched) {
    getDetails(deal).then((d) => {
      const markdown = dealMarkdown(deal, d);
      const metadata = DealMetadata(deal, d);
      setState({ isLoading: false, fetched: true, markdown, metadata });
    });
  }

  const actions = (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={getEntryURL(deal)} />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <Detail
      navigationTitle={deal.name}
      isLoading={state.isLoading}
      markdown={state.markdown}
      metadata={state.metadata}
      actions={actions}
    />
  );
};

const SearchListItem = ({ searchResult }: { searchResult: Deal }) => (
  <List.Item
    title={searchResult.name}
    actions={
      <ActionPanel>
        <ActionPanel.Section>
          <Action.OpenInBrowser url={getEntryURL(searchResult)} shortcut={{ modifiers: ["cmd"], key: "enter" }} />
          <Action.Push title="Show Details" icon={Icon.Sidebar} target={Details(searchResult)} />
        </ActionPanel.Section>
      </ActionPanel>
    }
  />
);

const Command = (): JSX.Element => {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search DekuDeals..." throttle>
      {state.results.map((searchResult) => (
        <SearchListItem key={searchResult.name} searchResult={searchResult} />
      ))}
      <List.EmptyView
        title={
          state.query.length < 3
            ? "Search for something (min. 3 characters)"
            : state.isLoading
            ? "Loading..."
            : "No results"
        }
      />
    </List>
  );
};

export default Command;
