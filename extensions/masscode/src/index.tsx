import { getPreferenceValues, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import type { Snippet, SnippetListEntry } from "./types";
import { EXAMPLE_SNIPPETS } from "./constants/exampleData";
import { transformSnippets } from "./utils/transformSnippets";
import { API_HEADERS, API_URL, getFragmentValue, parseResponse, showApiError } from "./utils/api";
import { useAppInstallation } from "./hooks/useAppInstallation";
import { SnippetListItem } from "./components/SnippetListItem";

const ENABLE_MOCK_DATA = getPreferenceValues<Preferences>().enableMockData;

export default function Command() {
  const isInstalled = useAppInstallation(ENABLE_MOCK_DATA);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useFetch<SnippetListEntry[]>(`${API_URL}/snippets?isDeleted=0`, {
    headers: API_HEADERS,
    parseResponse,
    execute: !ENABLE_MOCK_DATA && isInstalled === true,
    onError: showApiError,
  });

  const list = useMemo(() => {
    if (ENABLE_MOCK_DATA) return EXAMPLE_SNIPPETS;
    if (!data) return [];
    return transformSnippets(data);
  }, [data]);

  const selected = list.find((item) => item.id === selectedId) ?? list[0];

  const { data: selectedSnippet } = useFetch<Snippet>(`${API_URL}/snippets/${selected?.snippetId}`, {
    headers: API_HEADERS,
    parseResponse,
    execute: !ENABLE_MOCK_DATA && selected !== undefined,
    onError: showApiError,
  });

  return (
    <List
      isLoading={!ENABLE_MOCK_DATA && (isInstalled === undefined || isLoading)}
      isShowingDetail
      searchBarPlaceholder="Type to search snippets"
      onSelectionChange={setSelectedId}
    >
      {list.map((item) => (
        <SnippetListItem
          key={item.id}
          item={item}
          value={item === selected ? getFragmentValue(item, selectedSnippet) : item.value}
        />
      ))}
    </List>
  );
}
