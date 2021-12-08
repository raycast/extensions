import { ActionPanel, List, PushAction, OpenInBrowserAction } from "@raycast/api";
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
    setResults(searchResult)
    setLoading(false);
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search rubygems.org..."
      onSearchTextChange={onSearchTextChange}
      throttle
    >
    {
      results.length
        ?
        results.map(gem => {
          return <List.Item
            key={gem.sha}
            icon="list-icon.png"
            title={gem.name}
            accessoryTitle={`\u21E9 ${gem.downloads.toLocaleString()} | ${gem.version}`}
            subtitle={gem.info}
            actions={
              <ActionPanel>
                <PushAction
                  title="Show Details"
                  target={
                    <GemOptions key={gem.sha} gem={gem} />
                  }
                />
                <OpenInBrowserAction
                  title="Open source code"
                  url={gem.source_code_uri}
                />
                <OpenInBrowserAction
                  title="Open homepage"
                  url={gem.homepage_uri}
                />
              </ActionPanel>
            }
          />
        })
      : null
    }
    </List>
  );
}
