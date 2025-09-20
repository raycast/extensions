import { List, Detail, Icon } from "@raycast/api";
import { showFailureToast, useFetch, usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { URLSearchParams } from "node:url";
import { isMacPortsInstalled, listInstalledPorts } from "./exec";
import type { SearchResult } from "./types";
import SearchListItem from "./components/SearchListItem";
import type { MacPortsResponse } from "./types";
import { Onboarding } from "./components/Onboarding";

interface SearchPortsProps {
  arguments: {
    query?: string;
  };
}

export default function Command(props: SearchPortsProps) {
  const [searchText, setSearchText] = useState(props.arguments.query || "");
  const url = useMemo(() => {
    const params = searchText.length
      ? new URLSearchParams({ search: searchText })
      : new URLSearchParams({ categories: "devel" });
    return `https://ports.macports.org/api/v1/ports?${params}`;
  }, [searchText]);

  const { data: isInstalled, isLoading: isCheckingInstallation } = usePromise(async () => isMacPortsInstalled());

  const { data, isLoading } = useFetch(url, {
    parseResponse: parseFetchResponse,
    keepPreviousData: true,
    onError: async (error) => {
      await showFailureToast(error, { title: "Failed to fetch MacPorts data" });
    },
  });

  if (isCheckingInstallation) {
    return <Detail isLoading markdown="Checking MacPorts installation..." />;
  }

  if (!isInstalled) {
    return <Onboarding />;
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Macports..."
      throttle
      searchText={searchText}
    >
      {data?.length === 0 && (
        <List.EmptyView icon={Icon.Info} title="No Results" description="Try a different search term" />
      )}
      {data && data.length > 0 && (
        <List.Section title="Results" subtitle={`${data.length}`}>
          {data.map((searchResult) => (
            <SearchListItem key={searchResult.name} searchResult={searchResult} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as MacPortsResponse | { code: string; message: string };
  const installedPortsResult = await listInstalledPorts();

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.results.map((result) => {
    return {
      name: result.name,
      description: result.description,
      username: result.maintainers.map((maintainer) => maintainer.github).join(", "),
      url: result.homepage,
      installed: installedPortsResult?.includes(result.name),
      version: result.version,
    } as SearchResult;
  });
}
