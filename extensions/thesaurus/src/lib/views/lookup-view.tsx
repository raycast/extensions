import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import wordCacheHandler from "../cache";
import scraper from "../scraper";
import useStore from "../store";
import WordList from "./word-list";

const strengthColor = (strength: number) => {
  if (strength === 1) return Color.Red;
  if (strength === 2) return Color.Orange;
  if (strength === 3) return Color.Yellow;
  if (strength === 4) return Color.Green;
  return Color.Green;
};

const tagColor = (word: { strength: number }) => {
  return {
    adjustContrast: true,
    dark: strengthColor(word.strength),
    light: strengthColor(word.strength),
  };
};

const LookUpContent = ({ word }: { word: string }) => {
  const { results, setWord } = useStore(useShallow((state) => ({ results: state.results, setWord: state.setWord })));
  const renderables = useMemo(() => {
    if (!results) return <List.EmptyView title="Type to begin searching!" icon={{ source: "icon.png" }} />;
    if (results.status === "ERROR")
      return (
        <List.EmptyView
          title={`Uh oh, an error occurred!`}
          description={results.reason || "Something went wrong!"}
          icon={Icon.ExclamationMark}
        />
      );

    if (results.status === "NOT_FOUND")
      return (
        <List.Section title={`Did you mean?`}>
          {results.suggestions.map((entry, index) => (
            <List.Item
              key={index}
              title={entry}
              actions={
                <ActionPanel>
                  <Action
                    title="Search for Word"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => {
                      setWord(entry);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      );

    if (results.status === "OK")
      return results.entries.map((entry, index) => (
        <List.Section key={index} title={entry.pos}>
          {entry.data.map((value, index) => (
            <List.Item
              key={index}
              title={value.asIn}
              accessories={[{ tag: { value: (value.synonyms.length + value.antonyms.length).toString() } }]}
              actions={
                <ActionPanel>
                  {value.synonyms.length > 0 && (
                    <Action.Push
                      title="View Synonyms as List"
                      icon={Icon.List}
                      target={
                        <WordList
                          type="Synonym"
                          asIn={value.asIn}
                          definition={value.definition}
                          words={value.synonyms}
                        />
                      }
                    />
                  )}
                  {value.antonyms.length > 0 && (
                    <Action.Push
                      title="View Antonyms as List"
                      icon={Icon.List}
                      target={
                        <WordList
                          type="Antonym"
                          asIn={value.asIn}
                          definition={value.definition}
                          words={value.antonyms}
                        />
                      }
                    />
                  )}
                  {value.link && <Action.OpenInBrowser shortcut={{ modifiers: ["cmd"], key: "o" }} url={value.link} />}
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <Detail.Metadata>
                      <Detail.Metadata.Label title="Description" text={value.asIn} />
                      <Detail.Metadata.Label title="Definition" text={value.definition} />
                      {value.link && (
                        <Detail.Metadata.Link title="Link" target={value.link} text="Go to Merriam Webster" />
                      )}
                      <Detail.Metadata.Separator />
                      {value.synonyms.length > 0 && (
                        <>
                          <List.Item.Detail.Metadata.Label title="Synonyms:" />
                          <Detail.Metadata.TagList title="">
                            {value.synonyms.map((synonym, index) => (
                              <Detail.Metadata.TagList.Item key={index} text={synonym.word} color={tagColor(synonym)} />
                            ))}
                          </Detail.Metadata.TagList>
                        </>
                      )}
                      {value.antonyms.length > 0 && (
                        <>
                          <List.Item.Detail.Metadata.Label title="Antonyms:" />
                          <Detail.Metadata.TagList title="">
                            {value.antonyms.map((antonym, index) => (
                              <Detail.Metadata.TagList.Item key={index} text={antonym.word} color={tagColor(antonym)} />
                            ))}
                          </Detail.Metadata.TagList>
                        </>
                      )}
                    </Detail.Metadata>
                  }
                />
              }
            />
          ))}
        </List.Section>
      ));
  }, [results, word]);

  return <>{renderables}</>;
};

const { has, get, set } = wordCacheHandler();

interface LookupViewProps {
  selectedWord?: string;
}

const LookUpView = ({ selectedWord }: LookupViewProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const { word, setWord, setResults, isOK } = useStore(
    useShallow((state) => ({
      word: state.word,
      setWord: state.setWord,
      setResults: state.setResults,
      isOK: state.results?.status === "OK",
    })),
  );

  useEffect(() => {
    if (selectedWord && selectedWord !== word) {
      setWord(selectedWord);
    }
  }, [selectedWord, setWord]);

  const handleChange = useCallback(
    (e: string) => {
      if (e !== word) {
        setWord(e);
      }
    },
    [setWord, word],
  );

  useEffect(() => {
    if (!word) {
      setResults(undefined);
      return;
    }
    const debounce = setTimeout(async () => {
      setIsLoading(true);
      if (has(word) && get(word)) {
        setResults(get(word));
        setIsLoading(false);
        return;
      }
      const results = await scraper(word);
      setIsLoading(false);
      setResults(results);
      set(word, results);
    }, 500);

    return () => clearTimeout(debounce);
  }, [word]);

  return (
    <List isShowingDetail={isOK} isLoading={isLoading} searchText={word} onSearchTextChange={handleChange}>
      <LookUpContent word={word} />
    </List>
  );
};

export default LookUpView;
