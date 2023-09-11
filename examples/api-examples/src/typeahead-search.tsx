import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";
import { useState } from "react";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const params = new URLSearchParams();
  params.append("q", searchText.length === 0 ? "@raycast/api" : searchText);

  const { data, isLoading } = useFetch("https://api.npms.io/v2/search?" + params.toString(), {
    parseResponse,
    initialData: [],
    keepPreviousData: true,
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search npm packages..."
      throttle
    >
      <List.Section title="Results" subtitle={data.length + ""}>
        {data.map((searchResult) => (
          <SearchListItem key={searchResult.name} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.description}
      accessories={[{ icon: Icon.Person, text: searchResult.username }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Install Command"
              content={`npm install ${searchResult.name}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function parseResponse(response: Response): Promise<SearchResult[]> {
  const json = (await response.json()) as
    | {
        results: {
          package: { name: string; description?: string; publisher?: { username: string }; links: { npm: string } };
        }[];
      }
    | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.results.map((result) => {
    return {
      name: result.package.name,
      description: result.package.description,
      username: result.package.publisher?.username,
      url: result.package.links.npm,
    };
  });
}

interface SearchResult {
  name: string;
  description?: string;
  username?: string;
  url: string;
}
