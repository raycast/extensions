import { ActionPanel, Action, List, getPreferenceValues } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";

export default function Command() {
  const { baseURL, token } = getPreferenceValues<{
    baseURL: string;
    token: string;
  }>();

  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useFetch(
    baseURL + "/api/bookmarks?" + new URLSearchParams(searchText.length === 0 ? { limit: "10" } : { q: searchText }),
    {
      parseResponse: parseFetchResponse,
      headers: {
        Authorization: `Token ${token}`,
      },
    }
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search bookmarks in linkding"
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  const title = searchResult.title.length === 0 ? searchResult.website_title : searchResult.title;
  const subtitle = searchResult.description.length === 0 ? searchResult.website_description : searchResult.description;
  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/** Parse the response from the fetch query into something we can display */
async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as
    | {
        results: SearchResult[];
      }
    | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.results.map((result) => {
    return result;
  });
}

interface SearchResult {
  id: number;
  url: string;
  title: string;
  description: string;
  website_title: string;
  website_description: string;
  is_archived: boolean;
  unread: boolean;
  shared: boolean;
  tag_names: string[];
  date_added: string;
  date_modified: string;
}
