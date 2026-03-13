import { ActionPanel, Icon, List, OpenInBrowserAction, PushAction } from "@raycast/api";
import { useState } from "react";
import { useHexSearch } from "./hex/useHexSearch";
import { PackageOptions } from "./components/PackageOptions";
import type { HexSearchResponse } from "./hex/types";

export default function SearchHex() {
  const [results, setResults] = useState<HexSearchResponse>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const onSearchTextChange = async (query: string) => {
    setLoading(true);
    const searchResult = await useHexSearch(query);
    setResults(searchResult);
    setLoading(false);
  };

  return (
    <List isLoading={loading} searchBarPlaceholder="Search Hex..." onSearchTextChange={onSearchTextChange} throttle>
      {results.length
        ? results.map((item, index) => {
            return (
              <List.Item
                key={index}
                icon="list-icon.png"
                title={item.name}
                accessoryTitle={`\u21E9 ${item.downloads.all} | ${item.latest_version}`}
                subtitle={item.meta.description}
                actions={
                  <ActionPanel>
                    <PushAction
                      title="Show Options"
                      icon={Icon.List}
                      target={<PackageOptions key={index} item={item} />}
                    />
                    <OpenInBrowserAction title="Open Homepage" url={item.html_url} />
                    <OpenInBrowserAction title="Open Docs" url={item.docs_html_url} />
                  </ActionPanel>
                }
              />
            );
          })
        : null}
    </List>
  );
}
