import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  LocalStorage,
  PopToRootType,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { useFetch, useLocalStorage } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { EngineForm } from "./components/EngineForm";
import { ManageEnginesView } from "./components/ManageEnginesView";
import { MultiSearchConfigView } from "./components/MultiSearchConfigView";
import { SearchActions } from "./components/SearchActions";
import { LAST_ENGINE_KEY, getEngine, getLastEngine, parseSuggestions, useCustomEngines } from "./engines";
import { useSearchHistory } from "./history";
import { getStoredMultiSearchEnabled, getStoredMultiSearchEngines, useMultiSearch } from "./multisearch";

const FALLBACK_TIP_KEY = "fallback-tip-shown";

async function showFallbackTipOnce() {
  if (await LocalStorage.getItem<boolean>(FALLBACK_TIP_KEY)) {
    return;
  }
  await LocalStorage.setItem(FALLBACK_TIP_KEY, true);
  await showToast({
    style: Toast.Style.Success,
    title: "Tip: Use Quick Search as a Fallback Command",
    message: 'Search "Manage Fallback Commands" in Raycast and enable Quick Search.',
  });
}

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
}

export default function Command(props: LaunchProps) {
  const { defaultEngine, rememberHistory, instantFallback } = getPreferenceValues<Preferences.Search>();
  const {
    engines,
    isLoading: isLoadingEngines,
    addCustomEngine,
    updateCustomEngine,
    removeCustomEngine,
  } = useCustomEngines();
  const multiSearch = useMultiSearch(engines);
  const [searchText, setSearchText] = useState(props.fallbackText || "");

  const fallbackQuery = (props.fallbackText ?? "").trim();
  const isInstantLaunch = instantFallback && fallbackQuery.length > 0;
  const instantLaunchStarted = useRef(false);

  const {
    value: storedEngineId,
    setValue: setStoredEngineId,
    isLoading: isLoadingStoredEngine,
  } = useLocalStorage<string>(LAST_ENGINE_KEY, defaultEngine);

  const activeEngineId = storedEngineId ?? defaultEngine;
  const engine = getEngine(activeEngineId, engines);
  const query = searchText.trim();
  const debouncedQuery = useDebounce(query, 250);
  const history = useSearchHistory(rememberHistory);

  const { data: suggestions, isLoading: isLoadingSuggestions } = useFetch(engine.suggestUrl(debouncedQuery), {
    execute: debouncedQuery.length > 0,
    keepPreviousData: true,
    parseResponse: parseSuggestions,
    initialData: [],
    onError: () => {},
  });

  useEffect(() => {
    if (props.launchContext !== undefined || props.fallbackText !== undefined) {
      LocalStorage.setItem(FALLBACK_TIP_KEY, true);
      return;
    }
    showFallbackTipOnce();
  }, []);

  useEffect(() => {
    if (!isInstantLaunch || instantLaunchStarted.current) {
      return;
    }
    instantLaunchStarted.current = true;
    (async () => {
      const isMulti = await getStoredMultiSearchEnabled();
      if (isMulti) {
        const multiEngines = await getStoredMultiSearchEngines();
        await Promise.all([
          history.add(fallbackQuery),
          (async () => {
            for (const eng of multiEngines) {
              await open(eng.searchUrl(fallbackQuery));
            }
          })(),
        ]);
      } else {
        await Promise.all([
          history.add(fallbackQuery),
          getLastEngine(defaultEngine).then((lastEngine) => open(lastEngine.searchUrl(fallbackQuery))),
        ]);
      }
      await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    })();
  }, []);

  if (isInstantLaunch) {
    return null;
  }

  const isMulti = multiSearch.isEnabled;
  const multiTitle = multiSearch.selectedEngines.map((e) => e.title).join(", ");
  const activeSubtitle = isMulti
    ? multiTitle
      ? `Multi-Search (${multiTitle})`
      : "Multi-Search"
    : `Search ${engine.title}`;

  return (
    <List
      isLoading={
        isLoadingEngines ||
        isLoadingStoredEngine ||
        history.isLoading ||
        multiSearch.isLoading ||
        (query.length > 0 && isLoadingSuggestions)
      }
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarPlaceholder={
        isMulti ? (multiTitle ? `Multi-Search (${multiTitle})…` : "Multi-Search…") : `Search ${engine.title}…`
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search Engine"
          value={activeEngineId}
          onChange={(id) => {
            setStoredEngineId(id);
          }}
        >
          {engines.map((item) => (
            <List.Dropdown.Item key={item.id} title={item.title} value={item.id} icon={item.icon} />
          ))}
        </List.Dropdown>
      }
    >
      {query.length > 0 ? (
        <>
          <List.Section title="Search">
            <List.Item
              title={query}
              subtitle={activeSubtitle}
              icon={isMulti ? Icon.Layers : engine.icon}
              actions={
                <SearchActions
                  query={query}
                  engine={engine}
                  engines={engines}
                  isMultiSearchEnabled={isMulti}
                  multiSearchEngines={multiSearch.selectedEngines}
                  onToggleMultiSearch={multiSearch.toggleMultiSearch}
                  onSearch={history.add}
                  onAddEngine={addCustomEngine}
                  onUpdateEngine={updateCustomEngine}
                  onRemoveEngine={removeCustomEngine}
                />
              }
            />
          </List.Section>
          <List.Section title="Suggestions">
            {suggestions
              .filter((suggestion) => suggestion.toLowerCase() !== query.toLowerCase())
              .map((suggestion) => (
                <List.Item
                  key={suggestion}
                  title={suggestion}
                  icon={Icon.MagnifyingGlass}
                  actions={
                    <SearchActions
                      query={suggestion}
                      engine={engine}
                      engines={engines}
                      isMultiSearchEnabled={isMulti}
                      multiSearchEngines={multiSearch.selectedEngines}
                      onToggleMultiSearch={multiSearch.toggleMultiSearch}
                      onSearch={history.add}
                      onRefine={() => setSearchText(`${suggestion} `)}
                      onAddEngine={addCustomEngine}
                      onUpdateEngine={updateCustomEngine}
                      onRemoveEngine={removeCustomEngine}
                    />
                  }
                />
              ))}
          </List.Section>
        </>
      ) : history.entries.length > 0 ? (
        <List.Section title="Recent Searches">
          {history.entries.map((entry) => (
            <List.Item
              key={entry}
              title={entry}
              icon={Icon.Clock}
              actions={
                <SearchActions
                  query={entry}
                  engine={engine}
                  engines={engines}
                  isMultiSearchEnabled={isMulti}
                  multiSearchEngines={multiSearch.selectedEngines}
                  onToggleMultiSearch={multiSearch.toggleMultiSearch}
                  onSearch={history.add}
                  onRefine={() => setSearchText(entry)}
                  onAddEngine={addCustomEngine}
                  onUpdateEngine={updateCustomEngine}
                  onRemoveEngine={removeCustomEngine}
                  historyActions={
                    <>
                      <Action
                        title="Remove Entry"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() => history.remove(entry)}
                      />
                      <Action
                        title="Clear History"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.RemoveAll}
                        onAction={history.clear}
                      />
                    </>
                  }
                />
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon={isMulti ? Icon.Layers : Icon.MagnifyingGlass}
          title={isMulti ? (multiTitle ? `Multi-Search (${multiTitle})` : "Multi-Search") : `Search ${engine.title}`}
          description={
            isMulti
              ? "Type a query to search all selected engines simultaneously in order."
              : rememberHistory
                ? "Type a query to get started. Recent searches will show up here."
                : "Type a query to get started."
          }
          actions={
            <ActionPanel>
              <Action
                title={isMulti ? "Turn off Multi-Search" : "Turn on Multi-Search"}
                icon={isMulti ? Icon.XMarkCircle : Icon.Checkmark}
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "m" },
                  Windows: { modifiers: ["ctrl"], key: "m" },
                }}
                onAction={multiSearch.toggleMultiSearch}
              />
              <Action.Push
                title="Configure Multi-Search…"
                icon={Icon.Gear}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "m" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "m" },
                }}
                target={<MultiSearchConfigView engines={engines} />}
              />
              <Action.Push
                title="Add Custom Search Engine"
                icon={Icon.Plus}
                target={<EngineForm onSave={addCustomEngine} />}
              />
              <Action.Push
                title="Manage Custom Engines"
                icon={Icon.Gear}
                target={
                  <ManageEnginesView
                    engines={engines}
                    onAdd={addCustomEngine}
                    onUpdate={updateCustomEngine}
                    onRemove={removeCustomEngine}
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
