import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { builtinSearchEngines } from "./data/builtin-search-engines";
import { getCustomSearchEngines, removeCustomSearchEngine } from "./data/custom-search-engines";
import {
  getBuiltinSearchEngine,
  getCustomSearchEnginesByTrigger,
  getEffectiveAliases,
  getEffectiveSearchEngines,
} from "./data/search-engines";
import type { SearchEngine } from "./types";
import { resolveDefaultSearchEngine, useDefaultSearchEngine } from "./data/cache";
import Fuse from "fuse.js";
import AddCustomSearchEngine from "./add-custom-search-engine";
import { getEngineTriggerPreference } from "./preferences";

type FilterType = "all" | "custom" | "builtin";

const getCustomEngineTag = (engine: SearchEngine, triggerPrefix: string) => {
  const overriddenBuiltin = getBuiltinSearchEngine(engine.t);
  if (!overriddenBuiltin) return "Custom";
  return overriddenBuiltin.t === engine.t
    ? `Overrides ${overriddenBuiltin.s}`
    : `Overrides ${triggerPrefix}${engine.t} (${overriddenBuiltin.s} alias)`;
};

export default function BrowseSearchEngines() {
  const { triggerPrefix, warning } = getEngineTriggerPreference();
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [customSearchEngines, setCustomSearchEngines] = useState<SearchEngine[]>(getCustomSearchEngines);
  const { push } = useNavigation();

  const customTriggers = useMemo(() => new Set(customSearchEngines.map((engine) => engine.t)), [customSearchEngines]);

  const getAliases = useMemo(() => {
    const customEnginesByTrigger = getCustomSearchEnginesByTrigger(customSearchEngines);
    const aliasesByEngine = new Map<SearchEngine, string[]>();
    return (engine: SearchEngine) => {
      let aliases = aliasesByEngine.get(engine);
      if (!aliases) {
        aliases = getEffectiveAliases(engine, customEnginesByTrigger);
        aliasesByEngine.set(engine, aliases);
      }
      return aliases;
    };
  }, [customSearchEngines]);

  const filteredByType = useMemo(() => {
    switch (filter) {
      case "custom":
        return customSearchEngines;
      case "builtin":
        return builtinSearchEngines;
      default:
        return getEffectiveSearchEngines(customSearchEngines);
    }
  }, [filter, customSearchEngines]);

  // Build the index on the first search and keep it while the engine list is unchanged.
  const getFuse = useMemo(() => {
    let fuse: Fuse<SearchEngine> | undefined;
    return () =>
      (fuse ??= new Fuse(filteredByType, {
        keys: [
          {
            name: "t",
            weight: 1,
          },
          {
            name: "ts",
            weight: 1,
            getFn: getAliases,
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
      }));
  }, [filteredByType, getAliases]);

  const [defaultSearchEngine, setDefaultSearchEngine] = useDefaultSearchEngine();
  const effectiveDefaultSearchEngine = useMemo(
    () => resolveDefaultSearchEngine(defaultSearchEngine, customSearchEngines),
    [defaultSearchEngine, customSearchEngines],
  );

  const query = searchText.trim();
  const trimmedSearch = (query.startsWith(triggerPrefix) ? query.slice(triggerPrefix.length) : query)
    .replace(/!/g, "")
    .trim();
  const filteredSearchEngines = useMemo(() => {
    if (!trimmedSearch) {
      return filteredByType.slice(0, 20);
    }

    const result = getFuse().search(trimmedSearch, {
      limit: 20,
    });
    return result.map((r) => r.item);
  }, [trimmedSearch, filteredByType, getFuse]);

  const setAsDefault = async (searchEngine: SearchEngine) => {
    setDefaultSearchEngine(searchEngine);
    await showToast({
      title: `Default search engine set to ${searchEngine.s}`,
      message: `${triggerPrefix}${searchEngine.t}`,
    });
  };

  const refreshCustomEngines = () => {
    setCustomSearchEngines(getCustomSearchEngines());
  };

  const handleAddEngine = () => {
    push(<AddCustomSearchEngine onEngineAdded={refreshCustomEngines} />);
  };

  const handleCustomizeEngine = (engine: SearchEngine) => {
    push(<AddCustomSearchEngine engine={engine} onEngineAdded={refreshCustomEngines} />);
  };

  const handleDeleteEngine = async (name: string, trigger: string) => {
    const options: Alert.Options = {
      title: "Delete Custom Search Engine",
      message: `Are you sure you want to delete the search engine "${name} [${triggerPrefix}${trigger}]"?`,
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
        message: `${name} [${triggerPrefix}${trigger}]`,
      });
    }
  };

  return (
    <List
      filtering={false}
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
        description={[
          filter === "custom"
            ? "Add custom search engines to extend your search capabilities"
            : "Try adjusting your search or filter",
          warning,
        ]
          .filter(Boolean)
          .join("\n\n")}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action title="Add Custom Search Engine" icon={Icon.Plus} onAction={handleAddEngine} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
      {filteredSearchEngines.length > 0 && (
        <List.Section title={warning ? "Invalid Engine Trigger Prefix" : undefined} subtitle={warning}>
          {filteredSearchEngines.map((searchEngine) => {
            const isOverridden = !searchEngine.isCustom && customTriggers.has(searchEngine.t);
            const isDefault = searchEngine === effectiveDefaultSearchEngine;
            const aliases = getAliases(searchEngine);
            const aliasShortcuts = aliases.map((alias) => `${triggerPrefix}${alias}`);

            return (
              <List.Item
                key={searchEngine.t}
                title={searchEngine.s}
                subtitle={`${triggerPrefix}${searchEngine.t}`}
                accessories={[
                  { tag: searchEngine.ad || searchEngine.d },
                  ...(aliases.length
                    ? [
                        {
                          text: `Aliases: ${aliasShortcuts.slice(0, 3).join(", ")}${aliases.length > 3 ? "…" : ""}`,
                          tooltip: aliasShortcuts.join(", "),
                        },
                      ]
                    : []),
                  { text: searchEngine.urls && searchEngine.urls.length > 1 ? `${searchEngine.urls.length} URLs` : "" },
                  { tag: searchEngine.isCustom ? getCustomEngineTag(searchEngine, triggerPrefix) : undefined },
                  { text: isDefault ? "Default" : "" },
                  { icon: isDefault ? Icon.CheckCircle : undefined },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      {!isOverridden && (
                        <Action title="Set as Default" icon={Icon.Star} onAction={() => setAsDefault(searchEngine)} />
                      )}
                      {searchEngine.urls && searchEngine.urls.length > 1 ? (
                        searchEngine.urls.map((url, index) => (
                          <Action.OpenInBrowser
                            key={index}
                            title={`Test Search - URL ${index + 1}`}
                            url={url.replace("{{{s}}}", "test")}
                          />
                        ))
                      ) : (
                        <Action.OpenInBrowser title="Test Search" url={searchEngine.u.replace("{{{s}}}", "test")} />
                      )}
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                      <Action
                        title="Add Custom Search Engine"
                        icon={Icon.Plus}
                        onAction={handleAddEngine}
                        shortcut={Keyboard.Shortcut.Common.New}
                      />
                      {searchEngine.isCustom ? (
                        <>
                          <Action
                            title="Edit Custom Search Engine"
                            icon={Icon.Pencil}
                            onAction={() => handleCustomizeEngine(searchEngine)}
                            shortcut={Keyboard.Shortcut.Common.Edit}
                          />
                          <Action
                            title="Delete Custom Search Engine"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            onAction={() => handleDeleteEngine(searchEngine.s, searchEngine.t)}
                            shortcut={Keyboard.Shortcut.Common.Remove}
                          />
                        </>
                      ) : !isOverridden ? (
                        <Action
                          title="Create Custom Override"
                          icon={Icon.Pencil}
                          onAction={() => handleCustomizeEngine(searchEngine)}
                        />
                      ) : null}
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                      {!isOverridden && (
                        <Action.CopyToClipboard
                          title="Copy Search Engine Shortcut"
                          content={`${triggerPrefix}${searchEngine.t}`}
                          shortcut={{
                            macOS: { modifiers: ["cmd", "shift"], key: "s" },
                            Windows: { modifiers: ["ctrl", "shift"], key: "s" },
                          }}
                        />
                      )}
                      {aliases.length > 0 && (
                        <ActionPanel.Submenu title="Copy Alias" icon={Icon.CopyClipboard}>
                          {aliasShortcuts.map((shortcut) => (
                            <Action.CopyToClipboard key={shortcut} title={`Copy ${shortcut}`} content={shortcut} />
                          ))}
                        </ActionPanel.Submenu>
                      )}
                      <Action.CopyToClipboard
                        title="Copy Search Engine Domain"
                        content={searchEngine.ad || searchEngine.d}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "d" },
                          Windows: { modifiers: ["ctrl", "shift"], key: "d" },
                        }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
