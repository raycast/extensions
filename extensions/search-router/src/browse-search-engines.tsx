import { Action, ActionPanel, getPreferenceValues, Icon, List, openExtensionPreferences, showHUD } from "@raycast/api";
import { useMemo, useState } from "react";
import { Clipboard } from "@raycast/api";
import { SearchEngine, searchEngines } from "./data/search-engines";

export default function BrowseSearchEngines() {
  const [searchText, setSearchText] = useState("");
  const defaultSearchEngine = getPreferenceValues<Preferences>().defaultSearchEngine;

  const filteredSearchEngines = useMemo(() => {
    const trimmedSearch = searchText.trim();
    return searchEngines
      .sort((a, b) => (b.r ?? 0) - (a.r ?? 0))
      .filter((engine) => engine.t.includes(trimmedSearch) || engine.s.includes(trimmedSearch))
      .slice(0, 20);
  }, [searchText]);

  const setAsDefault = async (searchEngine: SearchEngine) => {
    await Clipboard.copy(`${searchEngine.t}`);
    showHUD(`Shortcut for ${searchEngine.s} copied to clipboard`);
    await openExtensionPreferences();
  };

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Browse search engines by shortcut or name..."
      throttle
    >
      {filteredSearchEngines?.map((searchEngine) => (
        <List.Item
          key={searchEngine.t}
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
