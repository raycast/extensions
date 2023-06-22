import { ActionPanel, List, showToast, Action, Toast } from "@raycast/api";
import { useState, useCallback, useEffect } from "react";

import { ValidLanguagePairKey, ValidLanguagePairs } from "../constants";
import { ResultItem } from "../types";
import { parseDOMResult } from "../utils/parseDOMResult";
import { parseHTML } from "../utils/parseHTML";
import useData from "../utils/useData";

interface ResultListProps {
  languagePairKey: ValidLanguagePairKey;
}

export const ResultList = ({ languagePairKey }: ResultListProps): JSX.Element => {
  const [word, setWord] = useState<string | null>(null);
  const languagePair = ValidLanguagePairs[languagePairKey].pair;
  const navigationTitle = ValidLanguagePairs[languagePairKey].title;
  const {
    data: text,
    error,
    isLoading,
  } = useData({
    word,
    languagePair,
  });
  const parsedHTML = text ? parseHTML(text) : undefined;
  const parsedData = parsedHTML ? parseDOMResult(parsedHTML) : undefined;

  const onSearchTextChange = useCallback((text: string) => {
    const word = text.trim();

    if (word) {
      setWord(word);
    } else {
      setWord(null);
    }
  }, []);

  useEffect(() => {
    if (error) {
      console.error(error);
      showToast(Toast.Style.Failure, "Could not load data from Linguee");
    }
  }, [error]);

  return (
    <List
      throttle
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Input a word..."
      onSearchTextChange={onSearchTextChange}
    >
      {word && parsedData && !error ? (
        <>
          {parsedData.map((item) => (
            <ResultListItem key={`${item.lid}`} item={item} />
          ))}
        </>
      ) : null}
    </List>
  );
};

function ResultListItem({ item }: { item: ResultItem }): JSX.Element {
  const subtitle = item.translations.map((translation) => `${translation.word} (${translation.wordType})`).join(", ");

  return (
    <List.Item
      id={item.lid}
      title={`${item.word} (${item.wordType})`}
      subtitle={subtitle}
      icon="list-icon.png"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://www.linguee.com${item.href}`} />
        </ActionPanel>
      }
    />
  );
}
