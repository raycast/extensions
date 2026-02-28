import { useMemo, useState } from "react";

import { List, getPreferenceValues } from "@raycast/api";

import { ResultItem } from "@/components/ResultItem";
import { useCompatPrefetch } from "@/hooks/use-compat-prefetch";
import { useSearch } from "@/hooks/use-search";
import { isSupportedLanguage } from "@/lib/mdn";

type CommandPreferences = {
  defaultAction?: "preview" | "open";
  language?: string;
};

export default function MDNSearchResultsList() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const preferences = getPreferenceValues<CommandPreferences>();
  const preferredAction = preferences.defaultAction === "open" ? "open" : "preview";
  const language = isSupportedLanguage(preferences.language) ? preferences.language : "en-US";

  const { data, isLoading, revalidate } = useSearch(query, language);

  const selectedResult = useMemo(() => {
    return data.find((item) => item.id === selectedId) ?? data[0];
  }, [data, selectedId]);

  const compatByPath = useCompatPrefetch(data, selectedResult);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      searchBarPlaceholder={`Search MDN (${language})...`}
      onSearchTextChange={setQuery}
      onSelectionChange={setSelectedId}
      throttle
    >
      {data.map((result) => (
        <ResultItem
          key={result.id}
          result={result}
          locale={language}
          preferredAction={preferredAction}
          compat={compatByPath[result.path]}
          onReloadSearchIndex={revalidate}
        />
      ))}
    </List>
  );
}
