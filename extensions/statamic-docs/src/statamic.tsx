import { Action, ActionPanel, List, LocalStorage, showToast, Toast, Cache } from "@raycast/api";
import { useEffect, useState } from "react";
import { MeiliSearch } from "meilisearch";
import fetch from "node-fetch";
import { decode } from "html-entities";
import fallbackResults from "./../fallback-results.json";
import { VersionDropdown } from "./version_dropdown";

type SearchResult = {
  id: string;
  hierarchy_lvl0: string;
  hierarchy_lvl1: string;
  search_content: string | null;
  url: string;
};

type SearchResultList = {
  [key: string]: SearchResult[];
};

type Version = {
  version: string;
  branch: string;
  url: string;
  alpha: boolean | false;
};

export type { Version };

const client = new MeiliSearch({
  host: "https://search.statamic.dev",
  apiKey: "a8b8f82076221f9595dceca971be29c36cbccd772de5dbdb7f43dfac41557f95",
  httpClient: async (url, opts) => {
    const response = await fetch(url, {
      method: opts?.method?.toLocaleUpperCase() ?? "GET",
      headers: opts?.headers,
      body: opts?.body,
    });

    return response.json();
  },
});

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0; // todo: remove once the API is in production

const fetchAvailableVersions = async (): Promise<Version[] | null> => {
  try {
    const response = await fetch("http://statamic.dev.test/versions.json");
    return await response.json() as Version[];
  } catch (err) {
    await showToast(Toast.Style.Failure, "Failed to fetch available versions", err.message);
    return null;
  }
};

export default function main() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultList>({});
  const [selectedVersion, setSelectedVersion] = useState<Version | undefined>();
  const [availableVersions, setAvailableVersions] = useState<Version[]>([]);
  const [searchQuery, setSearchQuery] = useState<string | undefined>();
  const cache = new Cache();

  useEffect(() => {
    const initializeVersions = async () => {
      let availableVersions;
      const cachedAvailableVersions = cache.get('availableVersions');

      if (cachedAvailableVersions) {
        const parsed = JSON.parse(cachedAvailableVersions);

        // Ensure the cache isn't older than 24 hours
        if (parsed.timestamp + 1000 * 60 * 60 * 24 > Date.now()) {
          availableVersions = parsed.availableVersions;
        } else {
          availableVersions = await fetchAvailableVersions();
        }
      } else {
        availableVersions = await fetchAvailableVersions();
      }

      setAvailableVersions(availableVersions);

      cache.set('availableVersions', JSON.stringify({
        availableVersions,
        timestamp: Date.now(),
      }));

      let rememberedVersion = await LocalStorage.getItem('version');
      if (rememberedVersion) rememberedVersion = JSON.parse(rememberedVersion);

      setSelectedVersion(rememberedVersion ?? availableVersions[0]);
    };

    initializeVersions();
  }, []);

  useEffect(() => {
    if (selectedVersion && searchQuery !== undefined) {
      updateSearchResults(searchQuery);
    }
  }, [selectedVersion]);

  const versionChanged = async (value: string) => {
    const version = availableVersions.find((v) => v.version === value);
    setSelectedVersion(version);
    await LocalStorage.setItem('version', JSON.stringify(version));
  };

  const getTitle = (hit: SearchResult): string => {
    return hit.hierarchy_lvl1 || hit.hierarchy_lvl0 || "";
  };

  const getSubtitle = (hit: SearchResult): string => {
    return decode(hit.search_content || "");
  };

  const search = async (query = "") => {
    if (query === '') return;

    return await client.index(`docs-${selectedVersion.version}`)
      .search(query, {
        hitsPerPage: 20,
      })
      .then((res) => {
        setIsLoading(false);
        return res.hits as SearchResult[];
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Failed to search the Statamic documentation", err.message);
        return [];
      });
  };

  const updateSearchResults = async (query: string) => {
    if (!query) {
      setSearchResults(fallbackResults);
      return;
    }

    const results = (await search(query)) as SearchResult[];

    if (!results) return;

    setSearchResults(
      results.reduce((acc: SearchResultList, hit: SearchResult) => {
        const key = hit.hierarchy_lvl0 || "Other";

        if (!acc[key]) {
          acc[key] = [];
        }

        acc[key].push(hit);

        return acc;
      }, {})
    );
  };

  return (
    <List
      throttle={true}
      isLoading={isLoading}
      onSearchTextChange={async (value) => (setSearchQuery(value), updateSearchResults(value))}
      searchBarAccessory={<VersionDropdown id="version" versions={availableVersions} onChange={versionChanged} />}
    >
      {Object.entries(searchResults as SearchResultList).map(
        ([section, items]: [string, SearchResult[]], index: number) => {
          if (!selectedVersion) return;

          return (
            <List.Section title={section} key={index}>
              {items.map((hit: SearchResult) => {
                const url = `${selectedVersion.url}${hit.url}`;
                return (
                  <List.Item
                    key={hit.id}
                    title={getTitle(hit)}
                    subtitle={getSubtitle(hit)}
                    icon="command-icon.png"
                    actions={
                      <ActionPanel title={url}>
                        <Action.OpenInBrowser url={url} title="Open in Browser" />
                        <Action.CopyToClipboard content={url} title="Copy URL" />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        }
      )}
    </List>
  );
}
