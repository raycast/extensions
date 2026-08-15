import { ActionPanel, List, Icon, Action } from "@raycast/api";
import { useState } from "react";
import { useRubyGemsSearch } from "./rubygems/useRubyGemsSearch";
import { GemOptions } from "./components/GemOptions";
import type { GemsSearchResponse } from "./rubygems/types";

export default function SearchRubyGems() {
  const [results, setResults] = useState<GemsSearchResponse>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const onSearchTextChange = async (query: string) => {
    setLoading(true);
    const searchResult = await useRubyGemsSearch(query);
    setResults(searchResult);
    setLoading(false);
  };

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search rubygems.org..."
      onSearchTextChange={onSearchTextChange}
      throttle
    >
      {results.length
        ? results.map((gem) => {
            return (
              <List.Item
                key={gem.sha}
                icon="list-icon.png"
                title={gem.name}
                subtitle={gem.info}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Show Options"
                      icon={Icon.List}
                      target={<GemOptions key={gem.sha} gem={gem} />}
                    />
                    <Action.OpenInBrowser title="Open Source Code" url={gem.source_code_uri} />
                    <Action.OpenInBrowser title="Open Homepage" url={gem.homepage_uri} />
                  </ActionPanel>
                }
                accessories={[
                  {
                    text: `\u21E9 ${gem.downloads.toLocaleString()} | ${gem.version}`,
                  },
                ]}
              />
            );
          })
        : null}
    </List>
  );
}
