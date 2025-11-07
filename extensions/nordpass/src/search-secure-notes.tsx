/**
 * Search Secure Notes command for NordPass Raycast extension
 * Displays a searchable list of secure notes from NordPass export
 */

import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getSecureNotes, refreshCache } from "./lib/storage";
import { SecureNote } from "./types";
import { exportFileExists } from "./lib/preferences";

export default function SearchSecureNotes() {
  const [secureNotes, setSecureNotes] = useState<SecureNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSecureNotes();
  }, []);

  /**
   * Load secure notes from cache or export file
   */
  async function loadSecureNotes(forceRefresh: boolean = false) {
    try {
      setIsLoading(true);
      setError(null);

      // Check if export file exists
      if (!exportFileExists()) {
        setError("Export file not found");
        setIsLoading(false);
        return;
      }

      // Get secure notes from cache
      const allNotes = forceRefresh ? refreshCache().secureNotes : getSecureNotes();
      setSecureNotes(allNotes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load secure notes";
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
   * Filter secure notes based on search text
   */
  const filteredSecureNotes = secureNotes.filter((note) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return note.name.toLowerCase().includes(searchLower) || note.note.toLowerCase().includes(searchLower);
  });

  /**
   * Truncate note content for display
   */
  function truncateNote(note: string, maxLength: number = 100): string {
    if (note.length <= maxLength) return note;
    return note.substring(0, maxLength) + "...";
  }

  /**
   * Copy note content to clipboard
   */
  async function copyNote(note: SecureNote) {
    await showToast({
      style: Toast.Style.Success,
      title: "Copied",
      message: `Note "${note.name}" copied to clipboard`,
    });
  }

  // Show error state
  if (error && secureNotes.length === 0 && !isLoading) {
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
      searchBarPlaceholder="Search secure notes..."
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action title="Refresh Cache" icon={Icon.ArrowClockwise} onAction={() => loadSecureNotes(true)} />
        </ActionPanel>
      }
    >
      {filteredSecureNotes.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText ? "No secure notes found" : "No secure notes"}
          description={searchText ? "Try a different search term" : "Export your NordPass data to get started"}
        />
      ) : (
        filteredSecureNotes.map((note, index) => (
          <List.Item
            key={`${note.name}-${index}`}
            title={note.name}
            subtitle={truncateNote(note.note)}
            accessories={[{ text: note.folder || "", icon: Icon.Folder }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Note Content" content={note.note} onCopy={() => copyNote(note)} />
                <Action.CopyToClipboard
                  title="Copy Note Name"
                  content={note.name}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <Action
                  title="Refresh Cache"
                  icon={Icon.ArrowClockwise}
                  onAction={() => loadSecureNotes(true)}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
