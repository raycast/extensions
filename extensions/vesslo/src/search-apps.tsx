import { Icon, List } from "@raycast/api";
import { useState, useMemo } from "react";
import { VessloApp } from "./types";
import { SharedAppListItem } from "./components/SharedAppListItem";
import { useVessloData } from "./utils/useVessloData";

interface SearchResult {
  app: VessloApp;
  matchedFields: string[]; // ["developer", "memo", "tag"]
}

export default function SearchApps() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useVessloData();

  const searchResults = useMemo((): SearchResult[] => {
    if (!data) return [];

    const query = searchText.toLowerCase();
    if (!query) {
      return data.apps.map((app) => ({ app, matchedFields: [] }));
    }

    return data.apps
      .map((app) => {
        const matchedFields: string[] = [];

        // Check each field (skip app name - user doesn't want that shown)
        if (app.name.toLowerCase().includes(query)) {
          // Don't add to matchedFields - user said app name is not needed
        }
        if (app.developer?.toLowerCase().includes(query)) {
          matchedFields.push("developer");
        }
        if (app.memo?.toLowerCase().includes(query)) {
          matchedFields.push("memo");
        }
        if (app.tags.some((tag) => tag.toLowerCase().includes(query))) {
          matchedFields.push("tag");
        }

        // Include if any field matches
        const matches =
          app.name.toLowerCase().includes(query) || matchedFields.length > 0;

        return matches ? { app, matchedFields } : null;
      })
      .filter((result): result is SearchResult => result !== null);
  }, [data, searchText]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search apps by name, developer, tag, or memo..."
      onSearchTextChange={setSearchText}
    >
      {!data ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Vesslo data not found"
          description="Please run Vesslo app to export data"
        />
      ) : searchResults.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No apps found"
          description="Try a different search term"
        />
      ) : (
        searchResults.map((result) => (
          <SharedAppListItem
            key={result.app.id}
            app={result.app}
            matchedFields={result.matchedFields}
            onTagClick={(tag) => setSearchText(tag)}
          />
        ))
      )}
    </List>
  );
}
