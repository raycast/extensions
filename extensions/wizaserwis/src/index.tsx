import { ActionPanel, Action, List, Detail } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useFetch(
    "https://x8ki-letl-twmt.n7.xano.io/api:zVSSaW5y/search?" +
      // send the search query to the API
      new URLSearchParams({ q: searchText.length === 0 ? "-listall" : searchText + ":*" }),
    {
      parseResponse: parseFetchResponse,
    }
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Wyszukaj informacji o wizach za pomocą AI..."
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <SearchListItem key={searchResult.title} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function makeDetail(searchResult) {
  const markdown = `### ${searchResult.title}

  ${searchResult.remarks}
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Ważność" text={searchResult.validity} />
        </Detail.Metadata>
      }
    />
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.title}
      subtitle={searchResult.remarks}
      accessoryTitle={searchResult.validity}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push title="Show Details" target={makeDetail(searchResult)} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Install Command"
              content={`npm install ${searchResult.title}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
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
        results: {
          package: {
            title: string;
            remarks: string;
            validity: string;
          };
        }[];
      }
    | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.map((result) => {
    return {
      title: result.title,
      remarks: result.remarks,
      validity: result.validity,
    } as SearchResult;
  });
}

interface SearchResult {
  title: string;
  remarks?: string;
  validity?: string;
}
