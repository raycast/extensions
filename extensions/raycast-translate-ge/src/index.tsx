import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { WordListItem } from "./WordListItem";
import { Locale, TranslateResponse } from "./types";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [from, to]: [Locale, Locale] = /^[ა-ჰ]+$/.test(searchText) ? ["ka", "en"] : ["en", "ka"];
  const { data = [], isLoading } = useFetch(
    `https://beta2.translate.ge/api/translate?from=${from}&to=${to}&str=${encodeURIComponent(searchText)}`,
    {
      parseResponse: parseFetchResponse,
      execute: searchText.length > 0,
    },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter word to translate"
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((word) => <WordListItem key={word.id} word={word} />)}
      </List.Section>
    </List>
  );
}

/** Parse the response from the fetch query into something we can display */
async function parseFetchResponse(response: Response) {
  try {
    const data = (await response.json()) as TranslateResponse;
    return data.found.map((item) => ({
      id: item.id,
      word: item[data.from],
      translation: item[data.to].replace(/\r|\n|\t/g, ""),
      from: data.from,
      to: data.to,
    }));
  } catch (err) {
    return [];
  }
}
