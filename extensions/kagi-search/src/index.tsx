// In src/index.tsx
import { Action, ActionPanel, closeMainWindow, getPreferenceValues, Icon, Keyboard, List, open } from "@raycast/api";
import { getIcon, apiEnabled } from "./utils/resultUtils";

import { useSearch } from "./utils/useSearch";
import { SearchResult } from "./utils/types";
import { useState } from "react";
import FastGPTView from "./fastgpt-view";

interface ExtensionPreferences {
  token: string;
  apiKey: string;
}

export default function Command() {
  const { token, apiKey }: ExtensionPreferences = getPreferenceValues();
  const {
    isLoading,
    history,
    results,
    searchText,
    search,
    searchWithApi,
    addHistory,
    isFastGPTLoading,
    queryFastGPT,
    deleteAllHistory,
  } = useSearch(token, apiKey);

  const listItems: SearchResult[] = searchText.length === 0 ? history : results;
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);

  const [showFastGPTView, setShowFastGPTView] = useState(false);
  const [fastGPTQuery, setFastGPTQuery] = useState("");

  // If we should show the FastGPT view
  if (showFastGPTView && fastGPTQuery) {
    return <FastGPTView query={fastGPTQuery} />;
  }

  return (
    <List
      isLoading={isLoading || isFastGPTLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search Kagi or type a URL... (end with ? for FastGPT)"
      throttle
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id || undefined)}
      navigationTitle={searchText ? `Results for "${searchText}"` : "Kagi Search"}
    >
      <List.Section title={searchText.length === 0 ? "History" : "Results"} subtitle={listItems.length + ""}>
        {listItems.map((item) => (
          <List.Item
            key={item.id}
            id={item.id}
            title={item.query}
            subtitle={item.description}
            icon={getIcon(item)}
            actions={
              <ActionPanel>
                {apiEnabled ? (
                  <ActionPanel.Section title="Result">
                    {getPreferenceValues()["fastGptShortcut"] && item.query.endsWith("?") ? (
                      // For question mark queries, default action is Ask FastGPT
                      <Action
                        title="Ask FastGPT"
                        onAction={async () => {
                          item.description = "Ask FastGPT: " + item.query;
                          await queryFastGPT(item.query);
                          // Set the states to switch to FastGPT view
                          setFastGPTQuery(item.query);
                          setShowFastGPTView(true);
                          item.isFastGPT = true;
                          await addHistory(item);
                        }}
                        icon={{ source: Icon.QuestionMark }}
                      />
                    ) : item.isApiResult ? (
                      // For API results, default action is open in browser
                      <Action
                        title="Open in Browser"
                        onAction={async () => {
                          item.description = "Open " + item.url.split("/")[2] + " in Browser";
                          await addHistory(item);
                          await open(item.url);
                          await closeMainWindow();
                        }}
                        icon={{ source: Icon.Globe }}
                      />
                    ) : item.query.includes("!") ? (
                      <Action
                        title="Open in Browser"
                        onAction={async () => {
                          item.description = "Use a Kagi bang with: " + item.query;
                          item.hasBang = true;
                          await addHistory(item);
                          await open(item.url);
                          await closeMainWindow();
                        }}
                        icon={{ source: Icon.Exclamationmark }}
                      />
                    ) : (
                      // For auto-suggest results, default action is search with API
                      <Action
                        title="Search with Kagi API"
                        onAction={async () => {
                          const apiResults = await searchWithApi(item.query);
                          if (apiResults && apiResults.length > 0) {
                            await addHistory(item);
                          }
                        }}
                        icon={{ source: Icon.MagnifyingGlass }}
                      />
                    )}
                    {searchText.length === 0 && (
                      <Action
                        title="Delete History"
                        shortcut={Keyboard.Shortcut.Common.RemoveAll}
                        onAction={deleteAllHistory}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                      />
                    )}
                    {/* Additional actions... */}
                    {!(item.isApiResult || item.query.includes("!")) && (
                      <Action
                        title="Open in Browser"
                        shortcut={{
                          macOS: { modifiers: ["cmd"], key: "enter" },
                          Windows: { modifiers: ["ctrl"], key: "enter" },
                        }}
                        onAction={async () => {
                          await addHistory(item);
                          await open(`https://kagi.com/search?q=${encodeURIComponent(item.query)}`);
                          await closeMainWindow();
                        }}
                        icon={{ source: Icon.Globe }}
                      />
                    )}
                    {getPreferenceValues()["fastGptShortcut"] && !(item.isFastGPT || item.query.includes("?")) && (
                      <Action
                        title="Ask FastGPT"
                        shortcut={{
                          macOS: { modifiers: ["cmd", "opt"], key: "enter" },
                          Windows: { modifiers: ["ctrl", "alt"], key: "enter" },
                        }}
                        onAction={async () => {
                          await queryFastGPT(item.query);
                          setFastGPTQuery(item.query);
                          setShowFastGPTView(true);
                          item.isFastGPT = true;
                          await addHistory(item);
                        }}
                        icon={{ source: Icon.QuestionMark }}
                      />
                    )}
                    <Action
                      title="Open First Result"
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "enter" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
                      }}
                      onAction={async () => {
                        await addHistory(item);
                        await open(`https://kagi.com/search?q=${encodeURIComponent(item.query + " !")}`);
                        await closeMainWindow();
                      }}
                      icon={{ source: Icon.Exclamationmark }}
                    />
                  </ActionPanel.Section>
                ) : (
                  <ActionPanel.Section title="Result">
                    <Action
                      title="Open in Browser"
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "enter" },
                        Windows: { modifiers: ["ctrl"], key: "enter" },
                      }}
                      onAction={async () => {
                        await addHistory(item);
                        await open(`https://kagi.com/search?q=${encodeURIComponent(item.query)}`);
                        await closeMainWindow();
                      }}
                      icon={{ source: Icon.Globe }}
                    />
                    {searchText.length === 0 && (
                      <Action
                        title="Delete History"
                        shortcut={Keyboard.Shortcut.Common.RemoveAll}
                        onAction={deleteAllHistory}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                      />
                    )}
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
