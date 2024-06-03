import { useState } from "react";

import type { LaunchProps } from "@raycast/api";
import { Action, List } from "@raycast/api";

import type { SearchType } from "@/types";
import { Vocabulary } from "@/types";

import useOptionalSelection from "@/hooks/use-optional-selection";
import useSearchWords from "@/hooks/use-searchwords";

import Actions from "@/components/Actions";
import VocubalarySwitch from "@/components/VocubalarySwitch";

export interface extraOptions {
  useVocabulary?: boolean;
  helperTitle?: string;
  helperDescription?: string;
}

export default function SearchResults(
  type: SearchType,
  placeholder: string,
  launchProps: LaunchProps,
  { helperTitle, helperDescription, useVocabulary }: extraOptions = {},
) {
  const [search, setSearch] = useState<string>("");
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [vocabulary, setVocabulary] = useState<Vocabulary>(Vocabulary.English);

  useOptionalSelection(setSearch, typeof launchProps.fallbackText !== "undefined" && launchProps.fallbackText !== "");

  const { data, isLoading } = useSearchWords(search, type, useVocabulary ? vocabulary : undefined);

  return (
    <List
      searchBarPlaceholder={placeholder}
      isLoading={isLoading}
      throttle={true}
      onSearchTextChange={setSearch}
      isShowingDetail={search !== "" && showDetails}
      searchBarAccessory={useVocabulary ? <VocubalarySwitch onChange={setVocabulary} /> : null}
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
            actions={
              <Actions word={word}>
                <Action
                  title="Toggle Details"
                  onAction={() => setShowDetails((d) => !d)}
                  shortcut={{ key: "d", modifiers: ["cmd"] }}
                />
              </Actions>
            }
            detail={
              <List.Item.Detail
                markdown={
                  word.defs !== undefined
                    ? "```\n" + word.defs.map((d) => d.replaceAll("n\t", "")).join("\n\n") + "```"
                    : "No definitions found."
                }
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Tags">
                      {word.tags?.includes("n") ? <List.Item.Detail.Metadata.TagList.Item text="Noun" /> : null}
                      {word.tags?.includes("v") ? <List.Item.Detail.Metadata.TagList.Item text="Verb" /> : null}
                      {word.tags?.includes("adj") ? <List.Item.Detail.Metadata.TagList.Item text="Adjective" /> : null}
                      {word.tags?.includes("adv") ? <List.Item.Detail.Metadata.TagList.Item text="Adverb" /> : null}
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))
      )}
    </List>
  );
}
