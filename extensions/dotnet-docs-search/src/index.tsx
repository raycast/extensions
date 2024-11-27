import { Action, ActionPanel, List } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import { VersionDropdown } from "./version_dropdown";
import { DocResponse, Result } from "./types";

export default function SearchResultsList() {
  const [query, setQuery] = useState<null | string>(null);
  const [state, setState] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [version, setVersion] = useState<string>("all");

  useEffect(() => {
    async function fetch() {
      if (!query) {
        setState([]);
        return;
      }
      setIsLoading(true);
      const results = await searchDocsByQuery(query, version);
      setState(results);
      setIsLoading(false);
    }
    fetch();
  }, [query, version]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type to search .NET documentation..."
      onSearchTextChange={(text) => setQuery(text)}
      throttle
      searchBarAccessory={<VersionDropdown onVersionChange={setVersion} />}
    >
      {state.map((result, idx) => (
        <List.Item
          key={idx}
          title={result.displayName}
          icon={result.itemType.toLowerCase() + "-icon.svg"}
          subtitle={result.description}
          accessories={[{ text: result.itemType }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={result.url} />
              <Action.CopyToClipboard title="Copy URL to Clipboard" content={result.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function searchDocsByQuery(query: string, version: string): Promise<Result[]> {
  try {
    // https://learn.microsoft.com/api/apibrowser/dotnet/search?api-version=0.2&search=json&locale=en-us
    // https://learn.microsoft.com/api/apibrowser/dotnet/search?api-version=0.2&search=json&locale=en-us&$filter=monikers/any(t: t eq 'net-7.0')
    const api = "https://learn.microsoft.com/api/apibrowser/dotnet/search?api-version=0.2&locale=en-us";

    const params: Record<string, string> = {
      search: query,
    };

    if (version !== "all") {
      params["$filter"] = "monikers/any(t: t eq '" + version + "')";
    }

    const resp = await axios.get<DocResponse>(api, { params });

    return resp.data.results.map((document) => {
      // https://learn.microsoft.com/en-us/dotnet/api/system.text.json?view=net-5.0
      const url = new URL("https://learn.microsoft.com/en-us" + document.url);

      url.searchParams.set("view", version);

      document.url = url.toString();

      return document;
    });
  } catch (err) {
    // console.error(String(err));
    // if (err.response) {
    //   console.log(err.response.data);
    // }

    return Promise.resolve([]);
  }
}
