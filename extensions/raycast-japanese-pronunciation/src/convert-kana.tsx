import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useDeferredValue, useEffect, useState } from "react";

import { convertJapaneseToKana } from "./lib/kana";

type ConversionState = {
  hiragana: string;
  katakana: string;
  error?: string;
};

function ResultItem(props: { title: string; value: string; icon: Icon }) {
  return (
    <List.Item
      title={props.title}
      subtitle={props.value}
      icon={props.icon}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={props.value} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const deferredSearchText = useDeferredValue(searchText);
  const [results, setResults] = useState<ConversionState>({
    hiragana: "",
    katakana: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const input = deferredSearchText.trim();

    if (!input) {
      setResults({ hiragana: "", katakana: "" });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    convertJapaneseToKana(input)
      .then((conversion) => {
        if (cancelled) {
          return;
        }

        setResults({
          hiragana: conversion.hiragana,
          katakana: conversion.katakana,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setResults({
          hiragana: "",
          katakana: "",
          error:
            error instanceof Error ? error.message : "Unknown conversion error",
        });
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deferredSearchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type Japanese text, kanji, or a short sentence"
      throttle
    >
      {!searchText.trim() ? (
        <List.EmptyView
          icon={Icon.Text}
          title="Start Typing Japanese Text"
          description="Enter a word like 学校 or a short sentence to see hiragana and katakana output."
        />
      ) : results.error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Conversion Failed"
          description={results.error}
        />
      ) : (
        <List.Section title="Kana Output">
          <ResultItem
            title="Hiragana"
            value={results.hiragana}
            icon={Icon.TextDocument}
          />
          <ResultItem
            title="Katakana"
            value={results.katakana}
            icon={Icon.TextDocument}
          />
        </List.Section>
      )}
    </List>
  );
}
