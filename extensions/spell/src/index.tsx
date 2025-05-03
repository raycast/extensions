import { ActionPanel, Action, List } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useFetch(
    "https://api.datamuse.com/words?" +
      // send the search query to the API
      new URLSearchParams({ sp: searchText }),
    {
      parseResponse: parseFetchResponse,
      execute: searchText.length > 0,
    },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search English words..."
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + " Found"}>
        {data?.map((searchResult) => <SearchListItem key={searchResult.word} searchResult={searchResult} />)}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.word}
      subtitle={searchResult.score.toString()}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Word"
              content={searchResult.word}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/** Parse the response from the fetch query into something we can display */
async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as
    | {
        word: string;
        score: number;
      }[]
    | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.map((result) => {
    return {
      word: result.word,
      score: result.score,
    } as SearchResult;
  });
}

interface SearchResult {
  word: string;
  score: number;
}
