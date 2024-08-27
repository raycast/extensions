import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import { useFetch } from "@raycast/utils";
import { DictionaryWord, Transformed } from "./types";

import GrammarDetails from "./components/GrammarDetails";

export default function Command() {
  const [query, setQuery] = useState<string | undefined>();
  const [word, setWord] = useState<string | null>();
  const [showingDetail, setShowingDetail] = useState(true);
  const [wordList, setWordList] = useState<string[] | Transformed[]>([]);
  const { isLoading: isLoadingList } = useFetch<string[] | Transformed[], { matchedWords: string[] } | DictionaryWord>(
    `https://www.vocabula.lat/api/${query}`,
    {
      keepPreviousData: true,
      initialData: { matchedWords: [] },
      execute: query && query?.length > 2 ? true : false,
      parseResponse: async (response) => {
        const data = await response.json();
        if (data?.matchedWords) {
          setWordList(data.matchedWords);
          return data.matchedWords;
        } else if (data?.transformed) {
          const filteredData = data.transformed.filter((word: Transformed) => word?.grammar[0]?.word);
          setWordList(filteredData);
          return filteredData;
        }
        return [];
      },
    },
  );
  const { isLoading: isLoadingWord, data: dataWord } = useFetch<DictionaryWord, DictionaryWord>(
    `https://www.vocabula.lat/api/${word || query}`,
    {
      keepPreviousData: true,
      execute: word && word?.length > 2 ? true : false,
      initialData: {
        definitions: [],
        text: "",
        transformed: [],
        output: "",
      },
      parseResponse: async (response) => {
        const data = await response.json();
        if (data?.transformed) {
          data.transformed = data.transformed.filter((word: Transformed) => word?.grammar[0]?.word);
          return data;
        }
        return data;
      },
    },
  );

  const handleSelectedWord = (wordWithIndex: string | null) => {
    if (!wordWithIndex) return;
    const [word] = wordWithIndex.split("-");
    setWord(word.charAt(0).toLowerCase() + word.slice(1));
    setShowingDetail(true);
  };

  return (
    <List
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Type a Latin word or phrase..."
      isShowingDetail={showingDetail}
      onSelectionChange={(selected) => handleSelectedWord(selected)}
      isLoading={isLoadingList || isLoadingWord}
      throttle={true}
    >
      {wordList &&
        wordList?.length > 0 &&
        wordList?.map((word: string | Transformed, index: number) => {
          const rawTitle = typeof word === "string" ? word : word?.grammar?.[0]?.word;
          let title = rawTitle;
          if (title) title = rawTitle.replace(".", "");
          let upperCaseTitle = title;
          if (upperCaseTitle) upperCaseTitle = upperCaseTitle.charAt(0).toUpperCase() + upperCaseTitle.slice(1);
          const wordIndex = dataWord.transformed?.findIndex((item) => item.grammar[0].word.replace(".", "") === title);
          let firstWord = dataWord?.transformed?.[index];
          if (firstWord === undefined) firstWord = dataWord?.transformed?.[wordIndex];
          const metaData =
            firstWord?.grammar &&
            firstWord?.grammar?.map((grammar, grammarIndex) => (
              <GrammarDetails
                grammar={grammar}
                key={`${grammar?.part_of_speech}-${title}-${index}-${grammarIndex}`}
                last={grammarIndex === firstWord.grammar.length - 1}
              />
            ));

          const definitions = [
            firstWord?.definition?.base ? "*" + firstWord.definition.base + "*" : null,
            firstWord?.definition?.infinitive ? "inf. *" + firstWord.definition.infinitive + "*" : null,
            firstWord?.definition?.genitive ? "gen. *" + firstWord.definition.genitive + "*" : null,
            firstWord?.definition?.comparative ? "comp. *" + firstWord.definition.comparative + "*" : null,
            firstWord?.definition?.indicative ? "ind. *" + firstWord.definition.indicative + "*" : null,
            firstWord?.definition?.perfectum ? "perf. *" + firstWord.definition.perfectum + "*" : null,
            firstWord?.definition?.supinum ? "sup. *" + firstWord.definition.supinum + "*" : null,
            firstWord?.definition?.supine ? "sup. *" + firstWord.definition.supine + "*" : null,
          ].filter(Boolean);

          const markdown = `# ${upperCaseTitle}\n\n${definitions.join("; ")}\n\n${
            firstWord?.translation.join(" ") || "Missing translation"
          }`;

          const props: Partial<List.Item.Props> = {
            detail: (
              <List.Item.Detail
                markdown={markdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    {Array.isArray(metaData) ? [...metaData] : metaData}
                  </List.Item.Detail.Metadata>
                }
              />
            ),
          };

          return (
            <List.Section key={index}>
              <List.Item
                id={`${title}-${index}`}
                title={upperCaseTitle}
                {...props}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={`https://www.vocabula.lat/?q=${title}`} />
                  </ActionPanel>
                }
              />
            </List.Section>
          );
        })}
    </List>
  );
}
