import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import {
  listRegistryEntries,
  searchMiseRegistry,
  MiseRegistryEntry,
  listInstalledTools,
  formatMiseError,
} from "./tools/mise";
import { SearchResultItem } from "./components/SearchResultItem";

const RECOMMENDED_TOOLS = ["cargo-binstall", "jdx/usage", "sccache"];

export default function SearchRegistryCommand() {
  const [searchText, setSearchText] = useState("");
  const debouncedQuery = useDebounced(searchText, 400);

  const { data, isLoading, error, revalidate } = usePromise(searchMiseRegistry, [debouncedQuery], {
    execute: debouncedQuery.trim().length > 0,
  });
  const { data: registryEntries } = usePromise(listRegistryEntries, []);
  const { data: installedTools } = usePromise(listInstalledTools, []);

  const installedToolNames = useMemo(() => new Set(installedTools?.map((t) => t.name)), [installedTools]);

  const entries = data ?? [];
  const registryMap = useMemo(() => {
    const map = new Map<string, MiseRegistryEntry>();
    registryEntries?.forEach((entry) => {
      map.set(entry.name, entry);
    });
    return map;
  }, [registryEntries]);

  const results = entries.map((entry) => {
    const registryInfo = registryMap.get(entry.name);
    return {
      ...entry,
      identifier: entry.identifier ?? registryInfo?.identifier,
      description: entry.description ?? registryInfo?.description,
      url: entry.url ?? registryInfo?.url,
      backends: entry.backends ?? registryInfo?.backends ?? [],
    };
  });

  const recommendedResults = useMemo(() => {
    return RECOMMENDED_TOOLS.map((name) => {
      const registryName = name === "jdx/usage" ? "usage" : name;
      const registryInfo = registryMap.get(registryName);
      return {
        name,
        identifier: registryInfo?.identifier,
        description: registryInfo?.description,
        url: registryInfo?.url,
        backends: registryInfo?.backends ?? [],
      };
    });
  }, [registryMap]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      throttle
      searchBarPlaceholder="Search mise registry (e.g., node, cargo:ubi)"
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Search failed"
          description={formatMiseError(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}

      {!error && debouncedQuery.trim().length === 0 ? (
        <List.Section title="Recommended Tools">
          {recommendedResults.map((entry) => (
            <SearchResultItem
              key={`recommended-${entry.name}`}
              entry={entry}
              isInstalled={installedToolNames.has(entry.name)}
            />
          ))}
        </List.Section>
      ) : null}

      {!error && debouncedQuery.trim().length > 0 && entries.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No tools found"
          description={`No registry entries matched “${debouncedQuery}”.`}
        />
      ) : null}

      {results.map((entry) => (
        <SearchResultItem
          key={`${entry.name}-${entry.identifier ?? ""}`}
          entry={entry}
          isInstalled={installedToolNames.has(entry.name)}
        />
      ))}
    </List>
  );
}

function useDebounced(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
