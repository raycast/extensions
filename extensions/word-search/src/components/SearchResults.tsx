import { useMemo, useState } from "react";

import type { LaunchProps } from "@raycast/api";
import { Action, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import type { SearchType, Word } from "@/types";
import { Vocabulary } from "@/types";

import useHistory from "@/hooks/use-history";
import useOptionalSelection from "@/hooks/use-optional-selection";
import useSearchWords from "@/hooks/use-searchwords";

import Actions from "@/components/Actions";
import VocabularySwitch from "@/components/VocabularySwitch";

export interface extraOptions {
  useVocabulary?: boolean;
  helperTitle?: string;
  helperDescription?: string;
}

const getWordMarkdown = (word: Word) => {
  const defs =
    word.defs !== undefined
      ? word.defs.map((d) => "```\n" + d.replaceAll("n\t", "") + "\n```").join("\n\n")
      : "No definitions found.";

  const tags = [
    word.tags?.includes("n") ? "Noun" : null,
    word.tags?.includes("v") ? "Verb" : null,
    word.tags?.includes("adj") ? "Adjective" : null,
    word.tags?.includes("adv") ? "Adverb" : null,
  ].filter((t) => t !== null);

  const tagsText = tags.length > 0 ? `\n\n> _${tags.join(", ")}_` : "";

  return `## ${word.word}${tagsText}\n\n${defs}`;
};

export default function SearchResults(
  type: SearchType,
  placeholder: string,
  launchProps: LaunchProps,
  { helperTitle, helperDescription, useVocabulary }: extraOptions = {},
) {
  const [search, setSearch] = useState<string>("");
  const [showDetails, setShowDetails] = useCachedState<boolean>("showDetails", false);
  const [vocabulary, setVocabulary] = useState<Vocabulary>(Vocabulary.English);

  useOptionalSelection(setSearch, typeof launchProps.fallbackText !== "undefined" && launchProps.fallbackText !== "");

  const { data, isLoading } = useSearchWords(search, type, useVocabulary ? vocabulary : undefined);
  const { history, remove } = useHistory();
  const historyData = useMemo(() => {
    if (!search) {
      return history;
    }
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return history;
    }
    return history.filter((word) => word.word.toLowerCase().includes(normalizedSearch));
  }, [history, search]);

  return (
    <List
      searchBarPlaceholder={placeholder}
      isLoading={isLoading}
      throttle={true}
      onSearchTextChange={setSearch}
      isShowingDetail={search !== "" && showDetails}
      searchBarAccessory={useVocabulary ? <VocabularySwitch onChange={setVocabulary} /> : null}
      searchText={search}
    >
      {(!data || data.length === 0) && historyData.length === 0 ? (
        <List.EmptyView
          icon={"command-icon.png"}
          title={helperTitle ?? placeholder}
          description={search !== "" ? (isLoading ? "Searching..." : "No Results Found") : helperDescription}
        />
      ) : (
        <>
          {historyData.length > 0 && (
            <List.Section title="History">
              {historyData.map((word) => (
                <List.Item
                  icon={"command-icon.png"}
                  key={word.word + "history"}
                  title={word.word}
                  subtitle={word.defs !== undefined ? word.defs[0] : ""}
                  actions={
                    <Actions word={word}>
                      <Action
                        title="Toggle Details"
                        onAction={() => setShowDetails((d) => !d)}
                        shortcut={{ key: "d", modifiers: ["cmd"] }}
                      />
                      <Action
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        title="Remove from History"
                        shortcut={{ key: "x", modifiers: ["ctrl"] }}
                        onAction={() => remove(word)}
                      />
                    </Actions>
                  }
                  detail={<List.Item.Detail markdown={getWordMarkdown(word)} />}
                />
              ))}
            </List.Section>
          )}
          {data && data.length > 0 && (
            <List.Section title="Results">
              {data.map((word) => (
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
                  detail={<List.Item.Detail markdown={getWordMarkdown(word)} />}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
