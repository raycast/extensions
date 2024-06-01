import { useState } from "react";

import type { LaunchProps } from "@raycast/api";
import { List } from "@raycast/api";

import {SearchType, Vocabulary} from '@/types';

import useOptionalSelection from "@/hooks/use-optional-selection";
import useSearchWords from "@/hooks/use-searchwords";

import Actions from "@/components/Actions";
import VocubalarySwitch from '@/components/VocubalarySwitch';

export interface extraOptions {
  useVocabulary?: boolean;
  helperTitle?: string;
  helperDescription?: string;
}

export default function SearchResults(
  type: SearchType,
  placeholder: string,
  launchProps: LaunchProps,
  { helperTitle, helperDescription, useVocabulary }: extraOptions = {}
) {
  const [search, setSearch] = useState<string>("");
  const [vocubalary, setVocubalary] = useState<Vocabulary>(Vocabulary.English);

  useOptionalSelection(setSearch, typeof launchProps.fallbackText !== "undefined" && launchProps.fallbackText !== "");

  const { data, isLoading } = useSearchWords(search, type, useVocabulary ? vocubalary : undefined);

  return (
    <List
      searchBarPlaceholder={placeholder}
      isLoading={isLoading}
      throttle={true}
      onSearchTextChange={setSearch}
      searchBarAccessory={useVocabulary ? <VocubalarySwitch onChange={setVocubalary} /> : null}
      searchText={search}
    >
      {!data || data.length === 0 ? (
        <List.EmptyView
          icon={"command-icon.png"}
          title={helperTitle ?? placeholder}
          description={search !== "" ? (isLoading ? "Searching..." : "No Results Found") : helperDescription}
        />
      ) : (
        data.map((word) => (
          <List.Item
            icon={"command-icon.png"}
            key={word.word}
            title={word.word}
            subtitle={word.defs !== undefined ? word.defs[0] : ""}
            actions={<Actions word={word} />}
          />
        ))
      )}
    </List>
  );
}
