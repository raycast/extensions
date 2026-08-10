import { ActionPanel, Action, List } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const fetchUrl =
    "https://artifacthub.io/api/v1/packages/search?" +
    new URLSearchParams({
      ts_query_web: searchText,
      facets: "false",
      sort: "relevance",
      limit: "10",
      offset: "0",
    });
  const { data, isLoading } = useFetch(fetchUrl, {
    parseResponse: parseFetchResponse,
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Helm charts..."
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => <SearchListItem key={searchResult.id} searchResult={searchResult} />)}
        <SearchListItem
          key="more"
          searchResult={{
            id: "more",
            name: "Show more...",
            description: "",
            url: `https://artifacthub.io/packages/search?ts_query_web=${searchText}&sort=relevance&page=1`,
            icon: "",
          }}
        />
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.description}
      accessories={[{ text: searchResult.username, tooltip: searchResult.username }]}
      icon={{ source: searchResult.icon }}
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

interface ResultType {
  packages: PackagesItem[];
}
interface PackagesItem {
  package_id: string;
  name: string;
  normalized_name: string;
  category: number;
  logo_image_id: string;
  stars: number;
  description: string;
  version: string;
  app_version: string;
  license?: string;
  deprecated: boolean;
  signed: boolean;
  security_report_summary?: Security_report_summary;
  all_containers_images_whitelisted?: boolean;
  production_organizations_count: number;
  ts: number;
  repository: Repository;
  signatures?: string[];
}
interface Security_report_summary {
  low: number;
  high: number;
  medium: number;
  unknown: number;
  critical: number;
}
interface Repository {
  url: string;
  kind: number;
  name: string;
  official: boolean;
  display_name: string;
  repository_id: string;
  scanner_disabled: boolean;
  organization_name?: string;
  verified_publisher: boolean;
  organization_display_name?: string;
  user_alias?: string;
}

/** Parse the response from the fetch query into something we can display */
async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as ResultType | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.packages.map((result) => {
    return {
      id: result.package_id,
      name: result.name,
      description: result.description,
      username: result.repository.organization_name || result.repository.user_alias,
      url: `https://artifacthub.io/packages/helm/${result.repository.name}/${result.name}`,
      icon: result.logo_image_id
        ? `https://artifacthub.io/image/${result.logo_image_id}@1x`
        : "https://artifacthub.io/static/media/placeholder_pkg_helm.png",
    } as SearchResult;
  });
}

interface SearchResult {
  id: string;
  name: string;
  description?: string;
  username?: string;
  url: string;
  icon: string;
}
