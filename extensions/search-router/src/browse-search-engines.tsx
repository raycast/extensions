import { Action, ActionPanel, Icon, List, showToast, useNavigation, Alert, confirmAlert, Toast } from "@raycast/api";
import { useMemo, useState } from "react";
import { builtinSearchEngines } from "./data/builtin-search-engines";
import { getCustomSearchEngines, removeCustomSearchEngine } from "./data/custom-search-engines";
import type { SearchEngine } from "./types";
import { useDefaultSearchEngine } from "./data/cache";
import Fuse from "fuse.js";
import AddCustomSearchEngine from "./add-custom-search-engine";

type FilterType = "all" | "custom" | "builtin";

export default function BrowseSearchEngines() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [customSearchEngines, setCustomSearchEngines] = useState<SearchEngine[]>(getCustomSearchEngines());
  const { push } = useNavigation();

  const allSearchEngines = [...customSearchEngines, ...builtinSearchEngines];

  const filteredByType = useMemo(() => {
    switch (filter) {
      case "custom":
        return customSearchEngines;
      case "builtin":
        return builtinSearchEngines;
      default:
        return allSearchEngines;
    }
  }, [filter, customSearchEngines, builtinSearchEngines, allSearchEngines]);

  const fuse = new Fuse(filteredByType, {
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
      return filteredByType.slice(0, 20);
    }

    const result = fuse.search(trimmedSearch, {
      limit: 20,
    });
    return result.map((r) => r.item);
  }, [searchText, filteredByType, fuse]);

  const setAsDefault = async (searchEngine: SearchEngine) => {
    setDefaultSearchEngine(searchEngine);
    showToast({
      title: `Default search engine set to ${searchEngine.s}`,
      message: `!${searchEngine.t}`,
    });
  };

  const refreshCustomEngines = () => {
    setCustomSearchEngines(getCustomSearchEngines());
  };

  const handleAddEngine = () => {
    push(<AddCustomSearchEngine onEngineAdded={refreshCustomEngines} />);
  };

  const handleEditEngine = (engine: SearchEngine) => {
    push(<AddCustomSearchEngine engine={engine} onEngineAdded={refreshCustomEngines} />);
  };

  const handleDeleteEngine = async (name: string, trigger: string) => {
    const options: Alert.Options = {
      title: "Delete Custom Search Engine",
      message: `Are you sure you want to delete the search engine "${name} [!${trigger}]"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      removeCustomSearchEngine(trigger);
      refreshCustomEngines();
      await showToast({
        style: Toast.Style.Success,
        title: "Search engine deleted",
        message: `${name} [!${trigger}]`,
      });
    }
  };

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Browse search engines by shortcut or name..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter search engines"
          storeValue={true}
          onChange={(newValue) => setFilter(newValue as FilterType)}
        >
          <List.Dropdown.Item title="All Engines" value="all" />
          <List.Dropdown.Item title="Custom Only" value="custom" />
          <List.Dropdown.Item title="Built-in Only" value="builtin" />
        </List.Dropdown>
      }
      throttle
      isLoading={false}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Add Custom Search Engine" icon={Icon.Plus} onAction={handleAddEngine} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={filter === "custom" ? "No Custom Search Engines" : "No Search Engines Found"}
        description={
          filter === "custom"
            ? "Add custom search engines to extend your search capabilities"
            : "Try adjusting your search or filter"
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action title="Add Custom Search Engine" icon={Icon.Plus} onAction={handleAddEngine} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
      {filteredSearchEngines.map((searchEngine) => (
        <List.Item
          key={searchEngine.t}
          title={searchEngine.s}
          subtitle={`!${searchEngine.t}`}
          accessories={[
            { tag: searchEngine.ad || searchEngine.d },
            { text: searchEngine.isCustom ? "Custom" : "" },
            { text: searchEngine.t === defaultSearchEngine?.t ? "Default" : "" },
            { icon: searchEngine.t === defaultSearchEngine?.t ? Icon.CheckCircle : undefined },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Set as Default" icon={Icon.Star} onAction={() => setAsDefault(searchEngine)} />
                <Action.OpenInBrowser title="Test Search" url={searchEngine.u.replace("{{{s}}}", "test")} />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action
                  title="Add Custom Search Engine"
                  icon={Icon.Plus}
                  onAction={handleAddEngine}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                {searchEngine.isCustom && (
                  <>
                    <Action
                      title="Edit Custom Search Engine"
                      icon={Icon.Pencil}
                      onAction={() => handleEditEngine(searchEngine)}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                    <Action
                      title="Delete Custom Search Engine"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDeleteEngine(searchEngine.s, searchEngine.t)}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    />
                  </>
                )}
              </ActionPanel.Section>

              <ActionPanel.Section>
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
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
