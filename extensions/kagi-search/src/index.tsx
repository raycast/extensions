// In src/index.tsx
import { ActionPanel, closeMainWindow, getPreferenceValues, Icon, List } from "@raycast/api";
import { getIcon, apiEnabled } from "./utils/resultUtils";

import { useSearch } from "./utils/useSearch";
import open from "open";
import { SearchResult } from "./utils/types";
import React, { useState } from "react";
import FastGPTView from "./fastgpt-view";

interface ExtensionPreferences {
  token: string;
  apiKey: string;
}

export default function Command() {
  const { token, apiKey }: ExtensionPreferences = getPreferenceValues();
  const { isLoading, history, results, searchText, search, searchWithApi, addHistory, isFastGPTLoading, queryFastGPT } =
    useSearch(token, apiKey);

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
                      <ActionPanel.Item
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
                      <ActionPanel.Item
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
                      <ActionPanel.Item
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
                      <ActionPanel.Item
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
                    {/* Additional actions... */}
                    {!(item.isApiResult || item.query.includes("!")) && (
                      <ActionPanel.Item
                        title="Open in Browser"
                        shortcut={{ modifiers: ["cmd"], key: "enter" }}
                        onAction={async () => {
                          await addHistory(item);
                          await open(`https://kagi.com/search?q=${encodeURIComponent(item.query)}`);
                          await closeMainWindow();
                        }}
                        icon={{ source: Icon.Globe }}
                      />
                    )}
                    {getPreferenceValues()["fastGptShortcut"] && !(item.isFastGPT || item.query.includes("?")) && (
                      <ActionPanel.Item
                        title="Ask FastGPT"
                        shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
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
                    {true && (
                      <ActionPanel.Item
                        title="Open First Result"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                        onAction={async () => {
                          await addHistory(item);
                          await open(`https://kagi.com/search?q=${encodeURIComponent(item.query + " !")}`);
                          await closeMainWindow();
                        }}
                        icon={{ source: Icon.Exclamationmark }}
                      />
                    )}
                  </ActionPanel.Section>
                ) : (
                  <ActionPanel.Section title="Result">
                    <ActionPanel.Item
                      title="Open in Browser"
                      shortcut={{ modifiers: ["cmd"], key: "enter" }}
                      onAction={async () => {
                        await addHistory(item);
                        await open(`https://kagi.com/search?q=${encodeURIComponent(item.query)}`);
                        await closeMainWindow();
                      }}
                      icon={{ source: Icon.Globe }}
                    />
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
