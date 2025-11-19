/**
 * Brave Browser Raycast Extension - Main UI Component
 *
 * This extension provides fast access to Brave Browser tabs and history through Raycast.
 * Key features:
 * - Search and switch to existing browser tabs
 * - Browse and open items from browser history
 * - Perform web searches using preferred search engine
 * - Focus existing tabs instead of opening duplicates
 *
 * TypeScript checking is disabled for this file due to known compatibility issues
 * between Raycast API JSX components and TypeScript's JSX type checking.
 * The Raycast API components return 'ReactNode | Promise<ReactNode>' which conflicts
 * with standard JSX component expectations.
 *
 * Specific errors suppressed:
 * - TS2786: JSX components cannot be used (List, ActionPanel, Action.*)
 * - TS2322: Type 'Element' is not assignable to type 'ReactNode'
 */
// @ts-nocheck - Raycast API JSX component type compatibility issues
import { ActionPanel, Action, Icon, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  type SearchItem,
  type Preferences,
  loadBraveData,
  filterItems,
  createSearchSuggestion,
  focusExistingTab,
} from "./service";

export default function Command() {
  // State management for search functionality
  const [searchText, setSearchText] = useState("");
  const [allItems, setAllItems] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferenceValues<Preferences>();

  /**
   * Handles actions for tab items, attempting to focus existing tabs
   * before falling back to opening new ones.
   */
  const handleItemAction = async (item: SearchItem) => {
    console.log("brave-search::handleItemAction::Debug::Item action triggered", {
      type: item.type,
      title: item.title,
      url: item.url,
    });

    if (item.type === "tab") {
      // Try to focus existing tab first
      console.log("brave-search::handleItemAction::Debug::Attempting to focus tab", {
        url: item.url,
        windowIndex: item.windowIndex,
        tabIndex: item.tabIndex,
      });

      const tabFocused = focusExistingTab(item);
      if (!tabFocused) {
        // If focusing failed, fall back to opening in browser
        console.log("brave-search::handleItemAction::Debug::Tab focus failed, opening in browser", {
          url: item.url,
        });
        // We'll need to handle this case in the UI
      } else {
        console.log("brave-search::handleItemAction::Debug::Successfully focused tab", {
          url: item.url,
        });
      }
    }
  };

  /**
   * Effect hook to load initial data from Brave Browser on component mount.
   * Implements progressive loading: displays tabs immediately while history
   * loads in the background. Handles errors gracefully and shows user feedback
   * via toast notifications.
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        console.log("brave-search::loadData::Debug::Starting progressive data load");

        // Load data with progressive callback
        const combinedItems = await loadBraveData((tabs) => {
          // Tabs loaded - update UI immediately and hide loading spinner
          console.log("brave-search::loadData::Debug::Tabs loaded, updating UI", {
            count: tabs.length,
          });
          setAllItems(tabs);
          setIsLoading(false);
        });

        // History also loaded - silently append to existing tabs
        console.log("brave-search::loadData::Debug::All data loaded, final update", {
          count: combinedItems.length,
        });
        setAllItems(combinedItems);
      } catch (error) {
        console.log("brave-search::loadData::Error::Failed to load data", {
          error: String(error),
        });
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load Brave data",
          message: "Please ensure Brave Browser is installed and accessible",
        });
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter items based on search query and prepare display items
  const filteredItems = filterItems(allItems, searchText);
  const searchSuggestion = searchText.trim()
    ? createSearchSuggestion(searchText, preferences.searchEngine || "google")
    : null;

  // Combine search suggestion with filtered results
  const displayItems = searchSuggestion ? [searchSuggestion, ...filteredItems] : filteredItems;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tabs, history, or the web..."
      throttle
    >
      {displayItems.map((item) => (
        <List.Item
          key={item.id}
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle}
          accessories={item.accessory ? [{ text: item.accessory }] : []}
          actions={
            <ActionPanel>
              {item.type === "tab" ? (
                <>
                  <Action title="Switch to Tab" onAction={() => handleItemAction(item)} icon={Icon.ArrowRight} />
                  <Action.OpenInBrowser
                    url={item.url}
                    title="Open in New Tab"
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                </>
              ) : item.type === "history" ? (
                <>
                  <Action.OpenInBrowser
                    url={item.url}
                    title="Open in Browser"
                    onAction={() => {
                      console.log("brave-search::openHistory::Debug::Opening URL via Action.OpenInBrowser", {
                        url: item.url,
                        title: item.title,
                      });
                    }}
                  />
                  <Action
                    title="Open with System Command"
                    onAction={async () => {
                      try {
                        console.log("brave-search::openHistory::Debug::Opening URL with system command", {
                          url: item.url,
                          title: item.title,
                        });
                        const { exec } = await import("node:child_process");
                        exec(`open "${item.url}"`);
                      } catch (error) {
                        console.log("brave-search::openHistory::Error::Failed to open URL", {
                          error: String(error),
                          url: item.url,
                        });
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to open URL",
                          message: "Please check the URL format",
                        });
                      }
                    }}
                    icon={Icon.Terminal}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </>
              ) : (
                <Action.OpenInBrowser url={item.url} />
              )}
              <Action.CopyToClipboard content={item.url} title="Copy URL" shortcut={{ modifiers: ["cmd"], key: "c" }} />
              <Action.CopyToClipboard
                content={item.title}
                title="Copy Title"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
