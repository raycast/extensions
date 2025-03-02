import { Action, ActionPanel, getPreferenceValues, Icon, List, openExtensionPreferences, showHUD } from "@raycast/api";
import { useState } from "react";
import { SearchEngine, useListSearchEngines } from "./lib/db";
import { Clipboard } from "@raycast/api";

export default function BrowseSearchEngines() {
  const [searchText, setSearchText] = useState("");
  const defaultSearchEngine = getPreferenceValues<Preferences>().defaultSearchEngine;

  const { data: searchEngines, isLoading } = useListSearchEngines(searchText);

  const setAsDefault = async (searchEngine: SearchEngine) => {
    await Clipboard.copy(`${searchEngine.t}`);
    showHUD(`Shortcut for ${searchEngine.s} copied to clipboard`);
    await openExtensionPreferences();
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
              <Action.OpenInBrowser title="Test Search" url={searchEngine.u.replace("{{{s}}}", "test")} />
              <Action title="Copy and Set as Default" icon={Icon.Star} onAction={() => setAsDefault(searchEngine)} />
              <Action.CopyToClipboard title="Copy Search Engine Shortcut" content={`!${searchEngine.t}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
