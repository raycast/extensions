import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getReferencesMatchingName } from "youversion-suggest";
import { getPreferredLanguage, getPreferredVersion } from "./preferences";
import ReferenceActions from "./reference-actions";
import { BibleReference } from "./types";

export default function Command() {
  const [query, setQuery] = useState("");

  const { data: results = [], isLoading } = useCachedPromise(
    async (searchText: string) => {
      if (!searchText.trim()) return [];
      return getReferencesMatchingName(searchText, {
        language: await getPreferredLanguage(),
        fallbackVersion: await getPreferredVersion(),
      });
    },
    [query],
    {
      keepPreviousData: true,
      failureToastOptions: {
        title: "Could not perform search",
      },
    },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Type the name of a chapter, verse, or range or verses..."
    >
      <List.Section title="Results" subtitle={results.length + ""}>
        {results.map((searchResult: BibleReference) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: BibleReference }) {
  return (
    <List.Item
      title={`${searchResult.name} (${searchResult.version.name})`}
      actions={<ReferenceActions searchResult={searchResult} />}
    />
  );
}
