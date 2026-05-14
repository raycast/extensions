import { List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useEffect } from "react";
import type { Snippet } from "./types";
import { MESSAGES } from "./constants";
import { EXAMPLE_SNIPPETS } from "./constants/exampleData";
import { transformSnippets } from "./utils/transformSnippets";
import { useAppInstallation } from "./hooks/useAppInstallation";
import { SnippetListItem } from "./components/SnippetListItem";

const preferences = getPreferenceValues<Preferences>();
const PORT = parseInt(preferences.port, 10) || 4321;
const ENABLE_MOCK_DATA = preferences.enableMockData;

export default function Command() {
  const isInstalled = useAppInstallation(ENABLE_MOCK_DATA);

  const { data, isLoading, error } = useFetch<Snippet[]>(`http://localhost:${PORT}/snippets`, {
    execute: !ENABLE_MOCK_DATA && isInstalled === true,
  });

  const list = useMemo(() => {
    if (ENABLE_MOCK_DATA) return EXAMPLE_SNIPPETS;
    if (!data) return [];
    return transformSnippets(data);
  }, [data]);

  useEffect(() => {
    if (error && !ENABLE_MOCK_DATA) {
      showToast(Toast.Style.Failure, MESSAGES.ERROR);
    }
  }, [error]);

  return (
    <List
      isLoading={!ENABLE_MOCK_DATA && (isInstalled === undefined || isLoading)}
      isShowingDetail
      searchBarPlaceholder="Type to search snippets"
    >
      {list.map((item) => (
        <SnippetListItem key={item.id} item={item} />
      ))}
    </List>
  );
}
