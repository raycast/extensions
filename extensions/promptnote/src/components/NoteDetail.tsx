import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Clipboard,
  useNavigation,
  Color,
  closeMainWindow,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  useSnippets,
  toggleFavorite,
  upvoteSnippet,
  downvoteSnippet,
} from "../lib/hooks/useSnippets";
import { useNote } from "../lib/hooks/useNotes";
import { Snippet } from "../lib/types";
import { EditSnippetForm } from "./EditSnippetForm";
import { CreateSnippetForm } from "./CreateSnippetForm";
import { formatCharCount } from "../lib/utils";
import { GlobalActionsSection } from "./CommonActions";
import { PinEntryForm } from "./PinEntryForm";
import {
  isPinUnlocked,
  decryptProtectedContent,
  lockNotes,
  getSessionTimeRemaining,
} from "../lib/pin";
import { DecryptedSnippetData } from "../lib/crypto";

interface NoteDetailProps {
  noteId: string;
  mutate: () => void;
}

export function NoteDetail({ noteId, mutate: parentMutate }: NoteDetailProps) {
  const { push, pop } = useNavigation();
  const { data: note, isLoading: noteLoading } = useNote(noteId);
  const {
    data: snippets,
    isLoading: snippetsLoading,
    mutate,
  } = useSnippets(noteId);
  // PIN protection state
  const [pinUnlocked, setPinUnlocked] = useState<boolean | null>(null);
  const [decryptedSnippets, setDecryptedSnippets] = useState<
    DecryptedSnippetData[] | null
  >(null);
  const [sessionMinutes, setSessionMinutes] = useState<number | null>(null);

  const isProtected = note?.is_protected === true;

  // Check PIN status when note loads
  useEffect(() => {
    if (!noteLoading && note) {
      if (!isProtected) {
        setPinUnlocked(true);
      } else {
        // Check if PIN session is active
        isPinUnlocked().then(setPinUnlocked);
      }
    }
  }, [noteLoading, note, isProtected]);

  // Decrypt content when unlocked and note is protected
  useEffect(() => {
    if (pinUnlocked && isProtected && note?.encrypted_content) {
      decryptProtectedContent(note.encrypted_content).then(
        setDecryptedSnippets,
      );
      getSessionTimeRemaining().then(setSessionMinutes);
    }
  }, [pinUnlocked, isProtected, note?.encrypted_content]);

  const isLoading = noteLoading || snippetsLoading || pinUnlocked === null;

  // Show PIN entry form if protected and not unlocked
  if (!isLoading && isProtected && !pinUnlocked) {
    return (
      <PinEntryForm
        noteTitle={note?.title}
        onSuccess={() => setPinUnlocked(true)}
        onCancel={() => pop()}
      />
    );
  }

  // Merge decrypted content with snippet metadata for protected notes
  const getSnippetContent = (snippet: Snippet): string => {
    if (isProtected && decryptedSnippets) {
      const decrypted = decryptedSnippets.find((d) => d.id === snippet.id);
      if (decrypted) {
        return decrypted.content;
      }
    }
    return snippet.content;
  };

  const getSnippetTitle = (snippet: Snippet): string => {
    if (isProtected && decryptedSnippets) {
      const decrypted = decryptedSnippets.find((d) => d.id === snippet.id);
      if (decrypted) {
        return decrypted.title;
      }
    }
    return snippet.title;
  };

  // Sort snippets by version (descending order - latest first)
  const sortedSnippets = snippets
    ? [...snippets].sort((a, b) => b.version - a.version)
    : [];

  const handleCopy = async (snippet: Snippet) => {
    const content = getSnippetContent(snippet);
    await Clipboard.copy(content);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
    });
    setTimeout(() => {
      closeMainWindow();
    }, 800);
  };

  const handleLock = async () => {
    await lockNotes();
    setPinUnlocked(false);
    await showToast({
      style: Toast.Style.Success,
      title: "Notes Locked",
      message: "Protected notes are now locked",
    });
  };

  const handleToggleFavorite = async (snippet: Snippet) => {
    try {
      await toggleFavorite(snippet.id);
      await mutate();
      await showToast({
        style: Toast.Style.Success,
        title: snippet.favorite
          ? "Removed from favorites"
          : "Added to favorites",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update favorite",
        message: String(error),
      });
    }
  };

  const handleUpvote = async (snippet: Snippet) => {
    try {
      await upvoteSnippet(snippet.id);
      await mutate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to upvote",
        message: String(error),
      });
    }
  };

  const handleDownvote = async (snippet: Snippet) => {
    try {
      await downvoteSnippet(snippet.id);
      await mutate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to downvote",
        message: String(error),
      });
    }
  };

  // Build markdown content for a snippet
  const buildMarkdown = (snippet: Snippet): string => {
    let markdown = "";

    // Add protection indicator for protected notes
    if (isProtected) {
      markdown += `> 🔒 **Protected Note**${sessionMinutes ? ` (Session: ${sessionMinutes} min remaining)` : ""}\n\n`;
    }

    // Add status line
    const statusIcons: string[] = [];
    if (snippet.favorite) statusIcons.push("❤️ Favorite");
    if (snippet.upvotes > 0) statusIcons.push("👍 Upvoted");
    if (snippet.downvotes > 0) statusIcons.push("👎 Downvoted");

    if (statusIcons.length > 0) {
      markdown += `> ${statusIcons.join(" • ")}\n\n`;
    }

    // Add title if present (use decrypted title for protected notes)
    const title = getSnippetTitle(snippet);
    if (title) {
      markdown += `## ${title}\n\n`;
    }

    // Add content (use decrypted content for protected notes)
    const content = getSnippetContent(snippet);
    markdown += content;

    // Add metadata footer
    markdown += `\n\n---\n`;
    markdown += `*Version ${snippet.version} of ${sortedSnippets.length} • Created ${new Date(snippet.created_at).toLocaleString()}*`;

    return markdown;
  };

  // Build metadata for the detail panel
  const buildMetadata = (snippet: Snippet) => {
    // Format snippet version and time (relative)
    const snippetTime = formatDistanceToNow(new Date(snippet.created_at), {
      addSuffix: true,
    });

    // Format note time (relative) - use updated_at to show most recent activity
    const noteTime = note
      ? formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })
      : "";

    // Combine into single line: "Snippets: Version X of Y · time ago | Note: time ago"
    const metadataLine = `Snippets: Version ${snippet.version} of ${sortedSnippets.length} · ${snippetTime} | Note: ${noteTime}`;

    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Note Title"
          text={note?.title || "Untitled"}
        />
        {note?.tags && note.tags.length > 0 && (
          <List.Item.Detail.Metadata.TagList title="Tags">
            {note.tags.map((tag) => (
              <List.Item.Detail.Metadata.TagList.Item
                key={tag}
                text={tag}
                color="#007AFF"
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
        )}
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="" text={metadataLine} />
      </List.Item.Detail.Metadata>
    );
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={note?.title || "Note Versions"}
      isShowingDetail={sortedSnippets.length > 0}
      searchBarPlaceholder="Search versions..."
    >
      {sortedSnippets.length === 0 ? (
        <List.EmptyView
          title="No Snippets Yet"
          description="Create your first snippet to get started!"
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action
                title="Create New Version"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() =>
                  push(
                    <CreateSnippetForm
                      noteId={noteId}
                      onSuccess={() => {
                        mutate();
                        parentMutate();
                      }}
                    />,
                  )
                }
              />
              <GlobalActionsSection noteId={noteId} />
            </ActionPanel>
          }
        />
      ) : (
        sortedSnippets.map((snippet, index) => {
          // Since we sort descending (latest first), latest is at index 0
          const isLatest = index === 0;

          // Build accessories for each version
          const accessories: List.Item.Accessory[] = [];

          // Latest badge
          if (isLatest) {
            accessories.push({
              tag: { value: "Latest", color: Color.Green },
            });
          }

          // Favorite icon
          if (snippet.favorite) {
            accessories.push({
              icon: { source: Icon.Heart, tintColor: Color.Red },
              tooltip: "Favorite",
            });
          }

          // Upvotes
          if (snippet.upvotes > 0) {
            accessories.push({
              icon: { source: Icon.ThumbsUp, tintColor: Color.Blue },
              tooltip: `${snippet.upvotes} upvote${snippet.upvotes > 1 ? "s" : ""}`,
            });
          }

          // Downvotes
          if (snippet.downvotes > 0) {
            accessories.push({
              icon: { source: Icon.ThumbsDown, tintColor: Color.Orange },
              tooltip: `${snippet.downvotes} downvote${snippet.downvotes > 1 ? "s" : ""}`,
            });
          }

          // Creation date
          accessories.push({
            date: new Date(snippet.created_at),
            tooltip: `Created: ${new Date(snippet.created_at).toLocaleString()}`,
          });

          // Character count
          accessories.push({
            text: formatCharCount(snippet.content.length),
            icon: Icon.Text,
            tooltip: `${snippet.content.length.toLocaleString()} characters`,
          });

          return (
            <List.Item
              key={snippet.id}
              id={snippet.id}
              title={`Version ${snippet.version}`}
              subtitle={snippet.title || undefined}
              accessories={accessories}
              detail={
                <List.Item.Detail
                  markdown={buildMarkdown(snippet)}
                  metadata={buildMetadata(snippet)}
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Copy to Clipboard"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                      onAction={() => handleCopy(snippet)}
                    />
                    <Action
                      title="Create New Version"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={() =>
                        push(
                          <CreateSnippetForm
                            noteId={noteId}
                            onSuccess={() => {
                              mutate();
                              parentMutate();
                            }}
                          />,
                        )
                      }
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Snippet Actions">
                    <Action
                      title={
                        snippet.favorite
                          ? "Remove from Favorites"
                          : "Add to Favorites"
                      }
                      icon={snippet.favorite ? Icon.HeartDisabled : Icon.Heart}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      onAction={() => handleToggleFavorite(snippet)}
                    />
                    <Action
                      title="Upvote"
                      icon={Icon.ThumbsUp}
                      shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                      onAction={() => handleUpvote(snippet)}
                    />
                    <Action
                      title="Downvote"
                      icon={Icon.ThumbsDown}
                      shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                      onAction={() => handleDownvote(snippet)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action
                      title="Edit Snippet"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={() =>
                        push(
                          <EditSnippetForm
                            snippet={snippet}
                            onSuccess={() => mutate()}
                          />,
                        )
                      }
                    />
                  </ActionPanel.Section>

                  <GlobalActionsSection
                    noteId={noteId}
                    showLock={isProtected}
                    onLock={handleLock}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
