import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { WordListItem } from "./WordListItem";
import { TranslateResponse } from "./types";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data = [], isLoading } = useFetch(`https://translate.ge/api/search/eng/${searchText}`, {
    parseResponse: parseFetchResponse,
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter word to translate"
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((word) => (
          <WordListItem key={word.id} word={word} />
        ))}
      </List.Section>
    </List>
  );
}

/** Parse the response from the fetch query into something we can display */
async function parseFetchResponse(response: Response) {
  try {
    const data = (await response.json()) as TranslateResponse;
    return data.hits.map((hit) => ({
      ...hit,
      desc: hit.desc.replace(/\r|\n|\t/g, " "),
    }));
  } catch (err) {
    return [];
  }
}
