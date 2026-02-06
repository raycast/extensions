import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

const API_BASE = "https://api.packrun.dev";
const WEB_BASE = "https://packrun.dev";

interface PackageHit {
  name: string;
  description: string;
  version: string;
  downloads: number;
  hasTypes: boolean;
  license: string;
  deprecated: boolean;
  author: string;
  homepage: string;
  repository: string;
  isESM: boolean;
  isCJS: boolean;
  dependencies: number;
  vulnerabilities: number;
}

interface SearchResponse {
  hits: PackageHit[];
  found: number;
  page: number;
}

function formatDownloads(count: number): string {
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export default function SearchPackages() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useFetch<SearchResponse>(
    `${API_BASE}/search?q=${encodeURIComponent(searchText)}&limit=20`,
    {
      keepPreviousData: true,
      execute: searchText.length > 0,
    },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search npm packages..."
      throttle
      filtering={false}
    >
      {searchText.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search npm packages"
          description="Start typing to search"
        />
      ) : data?.hits.length === 0 ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No packages found"
          description="Try a different search term"
        />
      ) : (
        data?.hits.map((hit) => (
          <List.Item
            key={hit.name}
            icon={hit.hasTypes ? Icon.Code : Icon.Box}
            title={hit.name}
            subtitle={hit.description}
            accessories={[
              ...(hit.deprecated
                ? [{ icon: Icon.ExclamationMark, tooltip: "Deprecated" }]
                : []),
              ...(hit.vulnerabilities > 0
                ? [
                    {
                      icon: Icon.Warning,
                      tooltip: `${hit.vulnerabilities} vulnerabilities`,
                    },
                  ]
                : []),
              ...(hit.hasTypes
                ? [{ tag: "TS", tooltip: "Has TypeScript types" }]
                : []),
              { text: `v${hit.version}` },
              {
                icon: Icon.Download,
                text: formatDownloads(hit.downloads),
                tooltip: "Weekly downloads",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open on Packrun.dev"
                  url={`${WEB_BASE}/${encodeURIComponent(hit.name)}`}
                />
                <Action.CopyToClipboard
                  title="Copy Install Command"
                  content={`npm install ${hit.name}`}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Package Name"
                  content={hit.name}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                {hit.homepage && (
                  <Action.OpenInBrowser
                    title="Open Homepage"
                    url={hit.homepage}
                    shortcut={{ modifiers: ["cmd"], key: "h" }}
                  />
                )}
                {hit.repository && (
                  <Action.OpenInBrowser
                    title="Open Repository"
                    url={hit.repository}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
