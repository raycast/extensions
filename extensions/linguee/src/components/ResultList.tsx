import { ActionPanel, List, showToast, Action, Toast } from "@raycast/api";
import { useState, useCallback, useEffect } from "react";
import useAxios, { configure } from "axios-hooks";

import { cache } from "../cache";
import { ValidLanguagePairKey, validLanguagePairs } from "../constants";
import { ResultItem } from "../types";
import { parseDOMResult } from "../utils/parseDOMResult";
import { parseHTML } from "../utils/parseHTML";

configure({ cache });

interface ResultListProps {
  languagePairKey: ValidLanguagePairKey;
}

export const ResultList = ({ languagePairKey }: ResultListProps): JSX.Element => {
  const [word, setWord] = useState<string>();
  const languagePair = validLanguagePairs[languagePairKey].pair;
  const navigationTitle = validLanguagePairs[languagePairKey].title;
  const [{ data, loading, error, response }] = useAxios<Buffer>(
    {
      url: `https://www.linguee.com/${languagePair}/search?qe=${encodeURIComponent(word || "")}&source=auto`,
      responseType: "arraybuffer",
      method: "GET",
    },
    { manual: !word || !languagePair }
  );
  const text = data
    ? data.toString(response?.headers?.["content-type"].includes("iso-8859-15") ? "latin1" : "utf-8")
    : undefined;
  const parsedHTML = text ? parseHTML(text) : undefined;
  const parsedData = parsedHTML ? parseDOMResult(parsedHTML) : undefined;

  const onSearchTextChange = useCallback((text = "") => {
    const word = text.trim();

    if (word) {
      setWord(word);
    } else {
      setWord(undefined);
    }
  }, []);

  useEffect(() => {
    if (error) {
      console.error("Request error:", error);
      showToast(Toast.Style.Failure, "Could not load data from Linguee");
    }
  }, [error]);

  return (
    <List
      throttle
      isLoading={loading}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Input a word..."
      onSearchTextChange={onSearchTextChange}
    >
      {word && parsedData && !error && (
        <>
          {parsedData.map((item) => (
            <ResultListItem key={`${item.lid}`} item={item} />
          ))}
        </>
      )}
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
