import { List, showToast, Toast, getPreferenceValues } from "@raycast/api";

import { useState, useEffect, useRef } from "react";
import { AbortError } from "node-fetch";
import { nanoid } from "nanoid";

import WordListItem from "./components/ListItems/WordListItem";
import KanjiListItem from "./components/ListItems/KanjiListItem";
import useJotobaAsync from "./useJotobaAsync";

/**
 * The main command for Raycast Jotoba
 */
export default function Command(props: { arguments: SearchArguments }) {
  const { term: argumentSearchTerm } = props.arguments;
  const [searchText, setSearchText] = useState(argumentSearchTerm ?? "");
  const { state, search } = useSearch();
  const { showDetailsInList, commonWordsFirst } = getPreferenceValues<Preferences>();

  useEffect(() => {
    void search(searchText);
  }, [searchText]);

  return (
    <List
      searchText={searchText}
      isLoading={state.isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Jotoba"
      throttle
      isShowingDetail={showDetailsInList === "list" && state.searchText !== ""}
    >
      {state.searchText !== "" ? (
        <>
          <List.Section title="Words" subtitle={state.results.words.length + ""}>
            {(commonWordsFirst
              ? [
                  ...state.results.words.filter((word) => word.common),
                  ...state.results.words.filter((word) => !word.common),
                ]
              : state.results.words
            ).map((word) => (
              <WordListItem key={word.id} wordResult={word} />
            ))}
          </List.Section>
          <List.Section title="Kanji" subtitle={state.results.kanji.length + ""}>
            {state.results.kanji.map((kanjiResult) => (
              <KanjiListItem key={kanjiResult.id} kanjiResult={kanjiResult} />
            ))}
          </List.Section>
        </>
      ) : (
        <List.EmptyView icon={{ source: "JotoHead.svg" }} title={"Type something to start your search."} />
      )}
    </List>
  );
}

/**
 * Search Hook used on the main command/search view
 */
function useSearch() {
  const getJotobaResults = useJotobaAsync();
  const [state, setState] = useState<SearchState>({
    searchText: "",
    results: { words: [], kanji: [] },
    isLoading: false,
  });
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  const search = async (searchText: string) => {
    const { userLanguage, useEnglishFallback } = getPreferenceValues<Preferences>();
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();

    try {
      if (searchText.length > 0) {
        setState((prevState) => ({
          ...prevState,
          searchText,
          isLoading: true,
        }));

        const results = (await getJotobaResults({
          bodyData: {
            query: searchText,
            no_english: !useEnglishFallback,
            language: userLanguage,
          },
          signal: cancelRef.current.signal,
        })) as Json;

        const words = results.words as JotobaWord[];
        const kanji = results.kanji as JotobaKanji[];

        setState((prevState) => ({
          searchText,
          isLoading: false,
          results: {
            words: words.map((wordEntry) => ({
              id: nanoid(),
              ...wordEntry,
            })),
            kanji: kanji.map((kanjiEntry) => ({
              id: nanoid(),
              ...kanjiEntry,
            })),
          },
        }));
      } else {
        setState((prevState) => ({ ...prevState, searchText: "", isLoading: false }));
      }
    } catch (error) {
      if (error instanceof AbortError) return;

      console.error("search error", error);

      showToast(Toast.Style.Failure, "Could not perform search", String(error));
    }
  };

  return {
    state: state,
    search: search,
  };
}
