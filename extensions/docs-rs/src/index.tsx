import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

export interface SearchResponse {
  crates: Crate[];
  meta: Meta;
}

export interface Crate {
  badges: unknown[];
  categories: unknown;
  created_at: string;
  description: string;
  documentation?: string;
  downloads: number;
  exact_match: boolean;
  homepage?: string;
  id: string;
  keywords: unknown;
  links: Links;
  max_stable_version: string;
  max_version: string;
  name: string;
  newest_version: string;
  recent_downloads: number;
  repository?: string;
  updated_at: string;
  versions: unknown;
}

export interface Links {
  owner_team: string;
  owner_user: string;
  owners: string;
  reverse_dependencies: string;
  version_downloads: string;
  versions: string;
}

export interface Meta {
  next_page: unknown;
  prev_page: unknown;
  total: number;
}

function docsUrl(crate_name: string, version: string) {
  return `https://docs.rs/${crate_name}/${version}`;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useFetch<SearchResponse>(
    `https://crates.io/api/v1/crates?page=1&per_page=20&q=${searchText}`,
    {
      keepPreviousData: true,
    }
  );

  const formatter = Intl.NumberFormat("en", { notation: "compact" });

  return (
    <List isLoading={isLoading} filtering={false} onSearchTextChange={setSearchText} throttle>
      {searchText
        ? (data?.crates || []).map((crate) => {
            return (
              <List.Item
                key={crate.id}
                title={`${crate.name} (${crate.max_stable_version})`}
                subtitle={crate.description}
                accessories={[
                  {
                    icon: Icon.ArrowDownCircle,
                    text: `${formatter.format(crate.downloads)}`,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title={`Open Stable (${crate.max_stable_version})`}
                      url={docsUrl(crate.name, crate.max_stable_version)}
                    />
                    <Action.OpenInBrowser
                      title={`Open Latest (${crate.newest_version})`}
                      url={docsUrl(crate.name, crate.newest_version)}
                    />
                  </ActionPanel>
                }
              />
            );
          })
        : null}
    </List>
  );
}
