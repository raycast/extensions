/**
 * Search Passwords command for NordPass Raycast extension
 * Displays a searchable list of passwords from NordPass export
 */

import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { refreshCache, getCachedData, clearCache } from "./lib/storage";
import { Password } from "./types";
import { exportFileExists } from "./lib/preferences";

export default function SearchPasswords() {
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadPasswords();
  }, []);

  /**
   * Load passwords from cache or export file
   */
  async function loadPasswords(forceRefresh: boolean = false) {
    try {
      setIsLoading(true);
      setError(null);

      // Check if export file exists
      if (!exportFileExists()) {
        setError("Export file not found");
        setIsLoading(false);
        return;
      }

      // Get passwords from cache
      if (forceRefresh) {
        const refreshed = refreshCache();
        setPasswords(refreshed.passwords);
        setLastUpdated(new Date(refreshed.lastUpdated));
      } else {
        const cached = getCachedData();
        setPasswords(cached.passwords);
        setLastUpdated(new Date(cached.lastUpdated));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load passwords";
      setError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Filter passwords based on search text
   */
  const filteredPasswords = passwords.filter((password) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      password.name.toLowerCase().includes(searchLower) ||
      password.username?.toLowerCase().includes(searchLower) ||
      password.url?.toLowerCase().includes(searchLower) ||
      password.note?.toLowerCase().includes(searchLower)
    );
  });

  /**
   * Copy password to clipboard
   */
  async function copyPassword(password: Password) {
    await showToast({
      style: Toast.Style.Success,
      title: "Copied",
      message: `Password for ${password.name} copied to clipboard`,
    });
  }

  /**
   * Copy username to clipboard
   */
  async function copyUsername(password: Password) {
    await showToast({
      style: Toast.Style.Success,
      title: "Copied",
      message: `Username for ${password.name} copied to clipboard`,
    });
  }

  /**
   * Clear cache and reload
   */
  async function handleClearCache() {
    try {
      clearCache();
      await showToast({
        style: Toast.Style.Success,
        title: "Cache Cleared",
        message: "Cache has been cleared. Reloading data...",
      });
      await loadPasswords(true);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to clear cache",
      });
    }
  }

  /**
   * Format last updated time
   */
  function formatLastUpdated(date: Date | null): string {
    if (!date) return "";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  // Show error state
  if (error && passwords.length === 0 && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Export File Not Found"
          description="Please export your NordPass data as CSV and set the export file path in Raycast preferences (⌘,)."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search passwords..."
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action title="Refresh Cache" icon={Icon.ArrowClockwise} onAction={() => loadPasswords(true)} />
          <Action title="Clear Cache" icon={Icon.Trash} onAction={handleClearCache} style={Action.Style.Destructive} />
        </ActionPanel>
      }
    >
      {filteredPasswords.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText ? "No passwords found" : "No passwords"}
          description={
            searchText
              ? `Try a different search term. Found ${passwords.length} total password${passwords.length !== 1 ? "s" : ""}.`
              : `Export your NordPass data to get started. ${lastUpdated ? `Last updated: ${formatLastUpdated(lastUpdated)}` : ""}`
          }
        />
      ) : (
        filteredPasswords.map((password, index) => (
          <List.Item
            key={`${password.name}-${index}`}
            title={password.name}
            subtitle={password.username || password.url || ""}
            accessories={[
              { text: password.url || "", icon: Icon.Link },
              { text: password.folder || "", icon: Icon.Folder },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Password"
                  content={password.password}
                  onCopy={() => copyPassword(password)}
                />
                {password.username && (
                  <Action.CopyToClipboard
                    title="Copy Username"
                    content={password.username}
                    onCopy={() => copyUsername(password)}
                  />
                )}
                {password.url && <Action.OpenInBrowser title="Open URL" url={password.url} />}
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={password.url || ""}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                />
                {password.note && (
                  <Action.CopyToClipboard
                    title="Copy Note"
                    content={password.note}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                )}
                <Action
                  title="Refresh Cache"
                  icon={Icon.ArrowClockwise}
                  onAction={() => loadPasswords(true)}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Clear Cache"
                  icon={Icon.Trash}
                  onAction={handleClearCache}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
