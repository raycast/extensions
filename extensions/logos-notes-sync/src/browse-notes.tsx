import { List, ActionPanel, Action, showToast, Toast, Icon, Color, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchAllNotes, isAuthenticated } from "./api";
import { processNotes, createLogosLink, expandPath } from "./utils";
import { ProcessedNote, Preferences } from "./types";

export default function Command() {
  const [notes, setNotes] = useState<ProcessedNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedResource, setSelectedResource] = useState<string>("all");
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not Logged In",
        message: "Please run 'Login to Faithlife' first",
      });
      setIsLoading(false);
      return;
    }

    try {
      const rawNotes = await fetchAllNotes();
      const processed = processNotes(rawNotes);
      setNotes(processed);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Notes",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Get unique resources for filtering
  const resources = [...new Set(notes.map((n) => n.resourceTitle))].sort();

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      !searchText ||
      note.text.toLowerCase().includes(searchText.toLowerCase()) ||
      note.resourceTitle.toLowerCase().includes(searchText.toLowerCase()) ||
      (note.reference && note.reference.toLowerCase().includes(searchText.toLowerCase()));

    const matchesResource = selectedResource === "all" || note.resourceTitle === selectedResource;

    return matchesSearch && matchesResource;
  });

  function getColorIcon(color: string | null): { source: Icon; tintColor: Color } {
    switch (color?.toLowerCase()) {
      case "yellow":
        return { source: Icon.Circle, tintColor: Color.Yellow };
      case "green":
        return { source: Icon.Circle, tintColor: Color.Green };
      case "blue":
        return { source: Icon.Circle, tintColor: Color.Blue };
      case "red":
        return { source: Icon.Circle, tintColor: Color.Red };
      case "orange":
        return { source: Icon.Circle, tintColor: Color.Orange };
      case "purple":
        return { source: Icon.Circle, tintColor: Color.Purple };
      default:
        return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search notes..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Resource" value={selectedResource} onChange={setSelectedResource}>
          <List.Dropdown.Item title="All Resources" value="all" />
          <List.Dropdown.Section title="Resources">
            {resources.map((resource) => (
              <List.Dropdown.Item key={resource} title={resource} value={resource} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredNotes.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Notes Found"
          description={searchText ? "Try a different search term" : "Sync your notes first"}
        />
      ) : (
        filteredNotes.map((note) => (
          <List.Item
            key={note.id}
            icon={getColorIcon(note.color)}
            title={note.text.slice(0, 100) + (note.text.length > 100 ? "..." : "")}
            subtitle={note.reference || undefined}
            accessories={[{ text: note.resourceTitle.slice(0, 30) }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Logos" url={createLogosLink(note.resourceId)} icon={Icon.Book} />
                <Action.CopyToClipboard title="Copy Note Text" content={note.text} />
                <Action.CopyToClipboard
                  title="Copy with Reference"
                  content={`${note.text}\n— ${note.reference || note.resourceTitle}`}
                />
                {preferences.obsidianVaultPath && (
                  <Action.Open
                    title="Open in Obsidian"
                    target={`obsidian://open?vault=${encodeURIComponent(
                      expandPath(preferences.obsidianVaultPath).split("/").pop() || "",
                    )}&file=${encodeURIComponent(note.resourceTitle)}`}
                    icon={Icon.Document}
                  />
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
