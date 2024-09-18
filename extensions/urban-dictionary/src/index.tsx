import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

export default function Command(props: { arguments: Arguments.Index }) {
  const [searchText, setSearchText] = useState(props.arguments.query ?? "");
  const { isLoading, data } = useSearch("autocomplete-extra", searchText);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Urban Dictionary"
      throttle
      searchText={searchText}
    >
      <List.Section title="Suggestions" subtitle={`${data?.length ?? 0}`}>
        {data?.map((searchResult) => <SearchListItem key={searchResult.preview} searchResult={searchResult} />)}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: UrbanAutocompleteResponseItem }) {
  return (
    <List.Item
      title={searchResult.term}
      subtitle={searchResult.preview}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push title="See Results" icon={Icon.Sidebar} target={<ItemDetails term={searchResult.term} />} />
            <Action.OpenInBrowser url={`https://www.urbandictionary.com/define.php?term=${searchResult.term}`} />
            <Action.CopyToClipboard
              title={`Copy "${searchResult.term}" to Clipboard`}
              content={searchResult.term}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ItemDetails({ term }: { term: string }) {
  const { isLoading, data } = useSearch("define", term);
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Definitions for "${term}"`}
      isShowingDetail
      filtering={true}
      navigationTitle="Show Definitions"
    >
      <List.Section title="Results" subtitle={`${data?.length ?? 0}`}>
        {data?.map((result) => (
          <List.Item
            key={result.defid}
            title={result.definition}
            detail={
              <List.Item.Detail
                markdown={getMarkdown(result)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Thumbs Up" text={result.thumbs_up.toString()} />
                    <List.Item.Detail.Metadata.Label title="Thumbs Down" text={result.thumbs_down.toString()} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Author" text={result.author} />
                    <List.Item.Detail.Metadata.Label
                      title="Date"
                      text={new Date(result.written_on).toLocaleDateString()}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser url={`https://www.urbandictionary.com/define.php?term=${term}`} />
                  <Action.CopyToClipboard
                    title={`Copy "${term}" to Clipboard`}
                    content={term}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function makeLinks(string: string) {
  return string.replace(
    /\[(.*?)\]/gm,
    (match, term) => `[${term}](https://www.urbandictionary.com/define.php?term=${term.replace(/\s/g, "+")})`,
  );
}

function getMarkdown(result: UrbanDefineResponseItem) {
  return `
${makeLinks(result.definition)}
> ${makeLinks(result.example.replace(/\r?\n/gm, "\n> "))}
`;
}

type Endpoint = "define" | "autocomplete-extra";

function useSearch<T extends Endpoint>(endpoint: T, initial = "") {
  const params = new URLSearchParams({ term: initial });
  return useFetch(`https://api.urbandictionary.com/v0/${endpoint}?${params.toString()}`, {
    method: "GET",
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const json = (await response.json()) as UrbanResponseList<typeof endpoint>;

      if ("list" in json) {
        return json.list as UrbanResponseItem<typeof endpoint>[];
      }

      return json.results as UrbanResponseItem<typeof endpoint>[];
    },
    keepPreviousData: true,
    execute: initial !== "",
  });
}

type UrbanAutocompleteResponseItem = {
  preview: string;
  term: string;
};

type UrbanDefineResponseItem = {
  definition: string;
  permalink: string;
  thumbs_up: number;
  author: string;
  word: string;
  defid: number;
  current_vote: string;
  written_on: string;
  example: string;
  thumbs_down: number;
};

type UrbanResponseItem<T extends Endpoint> = T extends "define"
  ? UrbanDefineResponseItem
  : UrbanAutocompleteResponseItem;

type UrbanResponseList<T extends Endpoint> = T extends "define"
  ? { list: UrbanDefineResponseItem[] }
  : { results: UrbanAutocompleteResponseItem[] };
