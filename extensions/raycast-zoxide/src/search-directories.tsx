import { Action, ActionPanel, getPreferenceValues, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState, useEffect, useMemo } from "react";
import { SearchResult } from "@components/search-result";
import { AddFromFinderAction } from "@components/add-from-finder-action";
import { SearchUsingSpotlightAction } from "@components/search-using-spotlight-action";
import { useZoxide } from "@hooks/use-zoxide";
import { useFzf } from "@hooks/use-fzf";
import { makeFriendly, makeUnfriendly, base64Encode } from "@utils/path-helpers";
import { base64ShellSanitize } from "@utils/misc";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [removedKeys, setRemovedKeys] = useCachedState<string[]>("removed-keys", []);

  const { "search-mode": mode } = getPreferenceValues<Preferences>();
  const pure = mode === "zoxide";

  // Pure mode re-queries zoxide per keystroke (an empty query lists everything by
  // score; otherwise the decoded terms become zoxide keywords). Fuzzy mode always
  // loads the full list once and lets fzf do the filtering.
  const trimmed = searchText.trim();
  const terms = base64ShellSanitize(makeUnfriendly(trimmed));
  const zoxideCommand = pure && trimmed ? `query -ls -- ${terms}` : "query -ls";

  const {
    isLoading,
    data,
    error,
    revalidate: queryZoxide,
  } = useZoxide(zoxideCommand, {
    keepPreviousData: true,
    execute: pure,
    failureToastOptions: { title: "Error querying zoxide" },
  });

  // The shell returns "command not found" (exit 127) when the binary is missing.
  const zoxideNotFound = !!error && /command not found|not found|ENOENT/i.test(error.message);

  // Reset removed keys on load; in fuzzy mode also trigger the one-time full query.
  useEffect(() => {
    setRemovedKeys([]);
    if (!pure) queryZoxide();
  }, []);

  const { isLoading: fzfLoading, data: fzfResults } = useFzf(searchText, {
    input: data,
    keepPreviousData: true,
    execute: !pure && !!data,
    failureToastOptions: { title: "Error querying fzf" },
  });

  // Both modes emit the same `score  path` lines: pure mode straight from zoxide,
  // fuzzy mode from fzf's filtered output.
  const resultLines = pure ? data : fzfResults;

  const searchResults = useMemo((): SearchResult[] => {
    if (!resultLines || !resultLines.length) return [];
    return resultLines
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
      })
      .slice(0, 500);
  }, [resultLines, removedKeys]);

  return (
    <List
      isLoading={isLoading || fzfLoading}
      throttle={pure}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search frequently used directories..."
    >
      <List.Section title="Results" subtitle={searchResults.length.toString()}>
        {searchResults.map((result: SearchResult) => (
          <SearchResult key={result.key} searchResult={result} searchText={searchText} onBoost={queryZoxide} />
        ))}
      </List.Section>
      {zoxideNotFound ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="zoxide not found"
          description="Install zoxide to use this extension, e.g. `brew install zoxide`. If it is installed elsewhere, add its directory under Additional path directories in preferences."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="View Installation Instructions"
                url="https://github.com/ajeetdsouza/zoxide#installation"
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          title="No results found"
          description="Would you like to search using Spotlight? Directories found and opened using Spotlight will be added to zoxide."
          actions={
            <ActionPanel>
              <SearchUsingSpotlightAction searchText={searchText} />
              <AddFromFinderAction />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
