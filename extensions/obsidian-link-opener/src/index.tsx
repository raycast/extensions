import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { GroupedNote } from "./types";
import { scanVaultForUrls } from "./services/fileScanner";
import { NoteGrouper } from "./services/noteGrouper";
import { getPropertyIcon } from "./utils/propertyIcons";
import open from "open";

export default function Command() {
  const [notes, setNotes] = useState<GroupedNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [needsVaultSelection, setNeedsVaultSelection] = useState(false);
  const noteGrouper = new NoteGrouper();

  useEffect(() => {
    async function fetchNotes() {
      try {
        const notesWithUrls = await scanVaultForUrls();
        const groupedNotes = await noteGrouper.groupAndSortNotes(notesWithUrls);
        setNotes(groupedNotes);
        setIsLoading(false);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Check if the error is due to no vault selected
        if (errorMessage.includes("No vault selected")) {
          setNeedsVaultSelection(true);
          setIsLoading(false);
          // Automatically open the vault selection command
          launchCommand({
            name: "select-vault",
            type: LaunchType.UserInitiated,
          });
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load notes",
            message: errorMessage,
          });
          setIsLoading(false);
        }
      }
    }

    fetchNotes();
  }, []);

  const handleUrlOpen = async (url: string, noteId: string) => {
    await noteGrouper.recordNoteUsage(noteId);
    open(url);
  };

  // Expand grouped notes back to individual items for better display
  const expandedItems = React.useMemo(
    () =>
      notes.flatMap((note) =>
        note.urls.map(
          (urlInfo: { url: string; source: string }, urlIndex: number) => ({
            id: `${note.id}-${urlInfo.source}-${urlIndex}`,
            noteTitle: note.title,
            urlSource: urlInfo.source,
            url: urlInfo.url,
            noteId: note.id,
            noteUrls: note.urls, // Include all URLs from the note
            aliases: note.aliases, // Include aliases for searching
            frecencyScore: note.frecencyScore || 0,
            frecencyBucket: note.frecencyBucket || 0,
            isFirstUrlForNote: urlIndex === 0,
            totalUrlsForNote: note.urls.length,
          })
        )
      ),
    [notes]
  );

  // Filter and score items based on search text
  const filteredItems = React.useMemo(() => {
    if (!searchText.trim()) {
      return expandedItems;
    }

    const searchTerm = searchText.toLowerCase();

    // Score each item based on match quality
    const scoredItems = expandedItems
      .map((item) => {
        const titleLower = item.noteTitle.toLowerCase();
        const sourceLower = item.urlSource.toLowerCase();
        const urlLower = item.url.toLowerCase();
        const aliasesLower = item.aliases?.map((a) => a.toLowerCase()) || [];

        let score = 0;
        let matches = false;

        // Check title matches
        if (titleLower.startsWith(searchTerm)) {
          score += 100; // Highest priority for prefix match
          matches = true;
        } else if (titleLower.includes(searchTerm)) {
          score += 50; // Lower priority for contains match
          matches = true;
        }

        // Check aliases matches
        for (const alias of aliasesLower) {
          if (alias.startsWith(searchTerm)) {
            score += 90; // High priority for alias prefix match
            matches = true;
            break;
          } else if (alias.includes(searchTerm)) {
            score += 45; // Lower priority for alias contains match
            matches = true;
            break;
          }
        }

        // Check source matches
        if (sourceLower.startsWith(searchTerm)) {
          score += 80;
          matches = true;
        } else if (sourceLower.includes(searchTerm)) {
          score += 40;
          matches = true;
        }

        // Check URL matches (lowest priority)
        if (urlLower.includes(searchTerm)) {
          score += 20;
          matches = true;
        }

        // Bonus for exact matches
        if (titleLower === searchTerm || sourceLower === searchTerm) {
          score += 200;
        }

        // Include frecency score as a tiebreaker
        score += item.frecencyScore * 0.1;

        return matches ? { ...item, searchScore: score } : null;
      })
      .filter(
        (item): item is (typeof expandedItems)[0] & { searchScore: number } =>
          item !== null
      )
      .sort((a, b) => b.searchScore - a.searchScore);

    return scoredItems;
  }, [expandedItems, searchText]);

  // Handle search text change
  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search notes by title or URL..."
      filtering={false}
      onSearchTextChange={handleSearchTextChange}
    >
      {filteredItems.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={needsVaultSelection ? Icon.Folder : Icon.Link}
          title={
            needsVaultSelection
              ? "No Vault Selected"
              : searchText
              ? "No Results Found"
              : "No URLs Found"
          }
          description={
            needsVaultSelection
              ? "Please select an Obsidian vault to continue"
              : searchText
              ? "Try a different search term"
              : "No notes with URLs in frontmatter were found in your vault"
          }
          actions={
            <ActionPanel>
              <Action
                title={
                  needsVaultSelection
                    ? "Select Vault"
                    : "Select Different Vault"
                }
                icon={Icon.Folder}
                onAction={() =>
                  launchCommand({
                    name: "select-vault",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {filteredItems.map((item) => {
            // Create cleaner title with visual distinction
            const title = item.isFirstUrlForNote
              ? `${item.noteTitle} • ${item.urlSource}`
              : `↳ ${item.urlSource}`;

            return (
              <List.Item
                key={item.id}
                title={title}
                subtitle={item.url}
                keywords={item.aliases}
                accessories={[
                  ...(item.totalUrlsForNote > 1 && item.isFirstUrlForNote
                    ? [{ text: `${item.totalUrlsForNote} URLs` }]
                    : []),
                  // Show property-specific icon
                  {
                    icon: getPropertyIcon(item.urlSource),
                  },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.OpenInBrowser
                        url={item.url}
                        onOpen={() => noteGrouper.recordNoteUsage(item.noteId)}
                      />
                      <Action.CopyToClipboard
                        content={item.url}
                        title="Copy URL"
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action
                        title="Open URL in Default App"
                        icon={Icon.Globe}
                        onAction={() => handleUrlOpen(item.url, item.noteId)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                      />
                    </ActionPanel.Section>
                    {item.noteUrls && item.noteUrls.length > 1 && (
                      <ActionPanel.Section title="Open Other URLs from This Note">
                        <>
                          {item.noteUrls
                            .filter(
                              (urlInfo) => urlInfo.source !== item.urlSource
                            )
                            .map((urlInfo) => {
                              // Define specific shortcuts for common URL types
                              const shortcutMap: Record<
                                string,
                                Keyboard.Shortcut
                              > = {
                                documentation: { modifiers: ["cmd"], key: "d" },
                                docs: { modifiers: ["cmd"], key: "d" },
                                help: { modifiers: ["cmd"], key: "h" },
                                github: { modifiers: ["cmd"], key: "g" },
                                webapp: {
                                  modifiers: ["cmd", "shift"],
                                  key: "w",
                                },
                                dashboard: { modifiers: ["cmd"], key: "b" },
                                homepage: { modifiers: ["cmd"], key: "o" },
                              };

                              return (
                                <Action.OpenInBrowser
                                  key={urlInfo.source}
                                  title={`Open ${
                                    urlInfo.source.charAt(0).toUpperCase() +
                                    urlInfo.source.slice(1)
                                  }`}
                                  url={urlInfo.url}
                                  icon={getPropertyIcon(urlInfo.source)}
                                  onOpen={() =>
                                    noteGrouper.recordNoteUsage(item.noteId)
                                  }
                                  shortcut={shortcutMap[urlInfo.source]}
                                />
                              );
                            })}
                        </>
                      </ActionPanel.Section>
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </>
      )}
    </List>
  );
}
