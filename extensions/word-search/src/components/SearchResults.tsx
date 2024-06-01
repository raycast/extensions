import { useMemo, useState } from "react";

import { Action, ActionPanel, List, getPreferenceValues } from "@raycast/api";

import type { SearchType, Word } from "@/types";

import useOptionalClipboard from "@/hooks/use-optional-clipboard";
import useSearchWords from "@/hooks/use-searchwords";

export default function SearchResults(
  type: SearchType,
  placeholder: string,
  useClipboard: boolean,
  helperTitle?: string,
  helperDescription?: string,
) {
  const [search, setSearch] = useState<string>("");
  useOptionalClipboard(setSearch, useClipboard);

  const { data, isLoading } = useSearchWords(search, type);

  return (
    <List
      searchBarPlaceholder={placeholder}
      isLoading={isLoading}
      throttle={true}
      onSearchTextChange={setSearch}
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

function Actions(props: { word: Word }) {
  const defaultAction = useMemo(() => {
    return getPreferenceValues<Preferences>().defaultAction || "paste";
  }, []);

  const pasteAction = <Action.Paste content={props.word.word} title="Paste Word in Active App" />;
  const copyAction = <Action.CopyToClipboard content={props.word.word} title="Copy Word to Clipboard" />;

  const [firstAction, secondAction] = defaultAction === "copy" ? [copyAction, pasteAction] : [pasteAction, copyAction];

  return (
    <ActionPanel>
      {firstAction}
      {secondAction}
    </ActionPanel>
  );
}
