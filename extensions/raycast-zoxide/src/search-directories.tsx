import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState, useEffect, useMemo } from "react";
import { SearchResult } from "@components/search-result";
import { AddFromFinderAction } from "@components/add-from-finder-action";
import { SpotlightResults } from "@components/spotlight-results";
import { useZoxide } from "@hooks/use-zoxide";
import { useFzf } from "@hooks/use-fzf";
import { makeFriendly, base64Encode } from "@utils/path-helpers";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [removedKeys, setRemovedKeys] = useCachedState<string[]>("removed-keys", []);

  const {
    isLoading,
    data,
    revalidate: queryZoxide,
  } = useZoxide("query -ls", {
    keepPreviousData: true,
    execute: false,
    failureToastOptions: { title: "Error querying zoxide" },
  });

  // Query zoxide results once on load and reset removed keys
  useEffect(() => {
    setRemovedKeys([]);
    queryZoxide();
  }, []);

  const { isLoading: fzfLoading, data: fzfResults } = useFzf(searchText, {
    input: data,
    keepPreviousData: true,
    execute: !!data,
    failureToastOptions: { title: "Error querying fzf" },
  });

  const searchResults = useMemo((): SearchResult[] => {
    if (!fzfResults || !fzfResults.length) return [];
    return fzfResults
      .split("\n")
      .flatMap((row: string): SearchResult | undefined => {
        const [, score, path] = row.trim().match(/^\s*([\d.]+)\s+(.*)$/) || [];
        if (!path) return; // Skip if path is not found
        const originalPath = path;
        const friendlyPath = makeFriendly(path);
        const key = base64Encode(originalPath);
        return { key, score, path: friendlyPath, originalPath } as SearchResult;
      })
      .filter((result: SearchResult | undefined) => !!result)
      .filter((result: SearchResult) => {
        return !removedKeys.includes(result.key);
      });
  }, [fzfResults, removedKeys]);

  return (
    <List
      isLoading={isLoading || fzfLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search frequently used directories..."
    >
      <List.Section title="Results" subtitle={searchResults.length.toString()}>
        {searchResults.map((result: SearchResult) => (
          <SearchResult key={result.key} searchResult={result} />
        ))}
      </List.Section>
      <List.EmptyView
        title="No results found"
        description="Would you like to search using Spotlight? Directories found and opened using Spotlight will be added to zoxide."
        actions={
          <ActionPanel>
            <Action.Push
              title="Search Using Spotlight"
              icon={Icon.MagnifyingGlass}
              target={<SpotlightResults query={searchText} />}
            />
            <AddFromFinderAction />
          </ActionPanel>
        }
      />
    </List>
  );
}
