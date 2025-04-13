import { Action, ActionPanel, Icon, List, showToast } from "@raycast/api";
import { useMemo, useState } from "react";
import { SearchEngine, searchEngines } from "./data/search-engines";
import { useDefaultSearchEngine } from "./data/cache";

export default function BrowseSearchEngines() {
  const [searchText, setSearchText] = useState("");

  const [defaultSearchEngine, setDefaultSearchEngine] = useDefaultSearchEngine();
  const filteredSearchEngines = useMemo(() => {
    const trimmedSearch = searchText.trim();
    return searchEngines
      .sort((a, b) => (b.r ?? 0) - (a.r ?? 0))
      .filter((engine) => engine.t.includes(trimmedSearch) || engine.s.includes(trimmedSearch))
      .slice(0, 20);
  }, [searchText]);

  const setAsDefault = async (searchEngine: SearchEngine) => {
    setDefaultSearchEngine(searchEngine);
    showToast({
      title: `Default search engine set to ${searchEngine.s}`,
      message: `!${searchEngine.t}`,
    });
  };

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Browse search engines by shortcut or name..."
      throttle
      isLoading={false}
    >
      {filteredSearchEngines.map((searchEngine) => (
        <List.Item
          key={searchEngine.t}
          title={searchEngine.s}
          subtitle={`!${searchEngine.t}`}
          accessories={[
            { text: searchEngine.t === defaultSearchEngine?.t ? "Default" : "" },
            { icon: searchEngine.t === defaultSearchEngine?.t ? Icon.CheckCircle : undefined },
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
