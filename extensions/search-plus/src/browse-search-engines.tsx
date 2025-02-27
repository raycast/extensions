import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { readPreferences, writePreferences } from "./lib/config";
import { SearchEngine, useListSearchEngines } from "./lib/search-engines";

export default function BrowseSearchTools() {
  const [searchText, setSearchText] = useState("");
  const { defaultSearchEngine } = readPreferences();

  const { data: searchEngines, isLoading } = useListSearchEngines(searchText);

  const setAsDefault = async (searchEngine: SearchEngine) => {
    try {
      writePreferences({ defaultSearchEngine: searchEngine.t });
      await showToast({
        style: Toast.Style.Success,
        title: "Default Updated",
        message: `${searchEngine.s} is now your default search engine`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Default Search Engine",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Browse search engines by shortcut or name..."
      throttle
    >
      {searchEngines?.map((searchEngine) => (
        <List.Item
          key={searchEngine.id}
          title={searchEngine.s}
          subtitle={`!${searchEngine.t}`}
          accessories={[
            { text: searchEngine.t === defaultSearchEngine ? "Default" : "" },
            { icon: searchEngine.t === defaultSearchEngine ? Icon.CheckCircle : undefined },
          ]}
          actions={
            <ActionPanel>
              <Action title="Set as Default" icon={Icon.Star} onAction={() => setAsDefault(searchEngine)} />
              <Action.OpenInBrowser title="Test Search" url={searchEngine.u.replace("{{{s}}}", "test")} />
              <Action.CopyToClipboard title="Copy Search Engine Shortcut" content={`!${searchEngine.t}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
