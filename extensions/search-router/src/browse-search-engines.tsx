import { Action, ActionPanel, Icon, List, showToast } from "@raycast/api";
import { useMemo, useState } from "react";
import { searchEngines } from "./data/search-engines";
import { SearchEngine } from "./types";
import { useDefaultSearchEngine } from "./data/cache";
import Fuse from "fuse.js";

export default function BrowseSearchEngines() {
  const [searchText, setSearchText] = useState("");

  const fuse = new Fuse(searchEngines, {
    keys: [
      {
        name: "t",
        weight: 1,
      },
      {
        name: "s",
        weight: 0.7,
      },
      {
        name: "ad",
        weight: 0.5,
      },
      {
        name: "d",
        weight: 0.3,
      },
    ],
  });

  const [defaultSearchEngine, setDefaultSearchEngine] = useDefaultSearchEngine();
  const filteredSearchEngines = useMemo(() => {
    const trimmedSearch = searchText.replace(/!/g, "").trim();
    if (!trimmedSearch) {
      return searchEngines.slice(0, 20);
    }

    const result = fuse.search(trimmedSearch, {
      limit: 20,
    });
    return result.map((r) => r.item);
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
            { tag: searchEngine.ad || searchEngine.d },
            { text: searchEngine.t === defaultSearchEngine?.t ? "Default" : "" },
            { icon: searchEngine.t === defaultSearchEngine?.t ? Icon.CheckCircle : undefined },
          ]}
          actions={
            <ActionPanel>
              <Action title="Set as Default" icon={Icon.Star} onAction={() => setAsDefault(searchEngine)} />
              <Action.OpenInBrowser title="Test Search" url={searchEngine.u.replace("{{{s}}}", "test")} />
              <Action.CopyToClipboard
                title="Copy Search Engine Shortcut"
                content={`!${searchEngine.t}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              />
              <Action.CopyToClipboard
                title="Copy Search Engine Domain"
                content={searchEngine.ad || searchEngine.d}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
