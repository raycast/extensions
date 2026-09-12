import { useState } from "react";

import type { LaunchProps } from "@raycast/api";
import { List } from "@raycast/api";

import { Vocabulary } from "@/types";

import useOptionalSelection from "@/hooks/use-optional-selection";
import useSuggestions from "@/hooks/use-suggestions";

import Actions from "@/components/Actions";
import VocabularySwitch from "@/components/VocabularySwitch";

export default function SuggestWord(launchProps: LaunchProps) {
  const placeholder = "Suggest a word";

  const [vocabulary, setVocabulary] = useState<Vocabulary>(Vocabulary.English);
  const [search, setSearch] = useState<string>("");
  useOptionalSelection(setSearch, typeof launchProps.fallbackText !== "undefined" && launchProps.fallbackText !== "");

  const { data, isLoading } = useSuggestions(search, vocabulary);

  return (
    <List
      searchBarPlaceholder={placeholder}
      isLoading={isLoading}
      throttle={true}
      onSearchTextChange={setSearch}
      searchBarAccessory={<VocabularySwitch onChange={setVocabulary} />}
      searchText={search}
    >
      {!data || data.length === 0 ? (
        <List.EmptyView
          icon={"command-icon.png"}
          title={placeholder}
          description={search !== "" ? (isLoading ? "Searching..." : "No Results Found") : ""}
        />
      ) : (
        data.map((word) => (
          <List.Item icon={"command-icon.png"} key={word.word} title={word.word} actions={<Actions word={word} />} />
        ))
      )}
    </List>
  );
}
