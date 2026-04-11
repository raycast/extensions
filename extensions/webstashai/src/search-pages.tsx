import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { ApiRequestError, handleApiError, searchPages } from "./api/client";
import { WEBSTASH_DASHBOARD_URL } from "./constants";
import { isValidApiKey } from "./helpers/utils";
import PageListItem from "./components/PageListItem";
import type { SearchResult } from "./types";

interface Arguments {
  query?: string;
}

export default function SearchPagesCommand(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const initialQuery = props.arguments?.query ?? "";
  const [searchText, setSearchText] = useState(initialQuery);

  const apiKey = getPreferenceValues<{ apiKey: string }>().apiKey;
  const keyValid = isValidApiKey(apiKey);

  const { data, isLoading } = useCachedPromise(
    async (query: string) => {
      if (!query.trim()) return [] as SearchResult[];
      const response = await searchPages(query);
      return response.results;
    },
    [searchText],
    {
      keepPreviousData: true,
      onError: async (error) => {
        const handled = await handleApiError(error);
        if (!handled) {
          const requestId =
            error instanceof ApiRequestError ? error.requestId : null;
          await showFailureToast("Search Failed", {
            message: error instanceof Error ? error.message : "Unknown error",
            primaryAction: requestId
              ? {
                  title: "Copy Error Details",
                  onAction: async () => {
                    const { Clipboard } = await import("@raycast/api");
                    await Clipboard.copy(
                      `Request ID: ${requestId}\nError: ${error}`,
                    );
                  },
                }
              : undefined,
          });
        }
      },
    },
  );

  if (!keyValid) {
    return <InvalidKeyView />;
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle={true}
      searchBarPlaceholder="Search your library..."
    >
      <List.EmptyView
        title={searchText.trim() ? "No Results Found" : "Search Your Library"}
        description={
          searchText.trim()
            ? "Try different keywords or a broader query"
            : "Start typing to search your saved pages"
        }
        icon={searchText.trim() ? Icon.MagnifyingGlass : Icon.Book}
      />
      {data?.map((result) => (
        <PageListItem key={result.id} page={result} />
      ))}
    </List>
  );
}

function InvalidKeyView() {
  return (
    <List>
      <List.EmptyView
        title="Invalid API Key"
        description="Your API key must start with 'wsk_'. Open extension preferences to update it."
        icon={Icon.ExclamationMark}
        actions={
          <ActionPanel>
            <Action
              title="Open Preferences"
              icon={Icon.Gear}
              onAction={async () => {
                const { openExtensionPreferences } =
                  await import("@raycast/api");
                await openExtensionPreferences();
              }}
            />
            <Action.OpenInBrowser
              title="Get Api Key"
              url={`${WEBSTASH_DASHBOARD_URL}/settings/api-keys`}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
