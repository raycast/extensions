import { ActionPanel, Action, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";

interface Preferences {
  WORKSPACE_ID: string;
  API_KEY: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useFetch(
    `https://main.api.owledge.app/v1/raycast_search/${preferences.WORKSPACE_ID}?` +
      new URLSearchParams({ query: searchText }).toString(),
    {
      headers: {
        Authorization: `Bearer ${preferences.API_KEY}`,
      },
      parseResponse: parseFetchResponse,
    },
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search in Owledge..." throttle>
      {data?.length == 0 && !isLoading ? (
        <List.EmptyView
          icon={{ source: "http://search.owledge.app/images/logo.svg" }}
          title={`No result found for "${searchText}"`}
        />
      ) : (
        <List.Section title="Owledge results" subtitle={data?.length + ""}>
          {data?.map((searchResult) => <SearchListItem key={searchResult.uid} searchResult={searchResult} />)}
        </List.Section>
      )}
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.title}
      subtitle={searchResult.subtitle}
      icon={`https://search.owledge.app/images/${searchResult.icon}`}
      accessories={[
        {
          text: `Last edit: ${searchResult.last_edited_at}`,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open" url={searchResult.url} />
            <Action.OpenInBrowser title={`Open Parent "${searchResult.parent_path}"`} url={searchResult.parent_url} />
            <Action.OpenInBrowser
              shortcut={{ modifiers: ["opt"], key: "enter" }}
              title="Search in Owledge App"
              url={searchResult.owledge_search_url}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy URL"
              content={searchResult.url}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Parent URL"
              content={searchResult.parent_url}
              shortcut={{ modifiers: ["cmd"], key: ";" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/** Parse the response from the fetch query into something we can display */
async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as { items: SearchResult[] } | { code: string; message: string };
  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }
  return json.items;
}

interface SearchResult {
  uid: string;
  title: string;
  subtitle: string;
  url: string;
  icon: string;
  last_edited_at: string;
  parent_url: string;
  parent_path: string;
  owledge_search_url: string;
}
