import React from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useState } from "react";
import { AuthWrapper } from "./components/AuthWrapper";
import { useTags, useNotesByTag } from "./lib/hooks/useNotes";
import { NoteListItem } from "./components/NoteListItem";
import { UtilityActionsSection } from "./components/CommonActions";
import { togglePin, archiveNote, deleteNote } from "./lib/hooks/useNotes";
import { fetchLatestSnippet } from "./lib/api/snippets";
function BrowseTagsContent() {
  const { data: tags, isLoading } = useTags();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  if (selectedTag) {
    return (
      <TagNotesView tag={selectedTag} onBack={() => setSelectedTag(null)} />
    );
  }

  // Build tag tree for hierarchical display
  const tagTree = buildTagTree(tags || []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tags...">
      {!isLoading && (tags?.length === 0 || !tags) ? (
        <List.EmptyView
          title="No Tags Found"
          description="Create notes with tags to organize your prompts."
          icon={Icon.Tag}
          actions={
            <ActionPanel>
              <UtilityActionsSection />
            </ActionPanel>
          }
        />
      ) : (
        renderTagTree(tagTree, setSelectedTag)
      )}
    </List>
  );
}

interface TagNode {
  name: string;
  fullPath: string;
  count: number;
  children: Map<string, TagNode>;
}

function buildTagTree(tags: string[]): Map<string, TagNode> {
  const tree = new Map<string, TagNode>();

  // Count occurrences of each tag prefix
  const tagCounts = new Map<string, number>();
  tags.forEach((tag) => {
    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  });

  tags.forEach((tag) => {
    const parts = tag.split("/");
    let currentLevel = tree;
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!currentLevel.has(part)) {
        currentLevel.set(part, {
          name: part,
          fullPath: currentPath,
          count: index === parts.length - 1 ? 1 : 0,
          children: new Map(),
        });
      } else if (index === parts.length - 1) {
        const node = currentLevel.get(part)!;
        node.count++;
      }

      currentLevel = currentLevel.get(part)!.children;
    });
  });

  return tree;
}

function renderTagTree(
  tree: Map<string, TagNode>,
  onSelect: (tag: string) => void,
  depth: number = 0,
): React.ReactNode[] {
  const items: React.ReactNode[] = [];

  tree.forEach((node) => {
    const hasChildren = node.children.size > 0;
    const indent = "  ".repeat(depth);

    items.push(
      <List.Item
        key={node.fullPath}
        title={`${indent}${node.name}`}
        subtitle={node.count > 0 ? `${node.count} notes` : undefined}
        icon={hasChildren ? Icon.Folder : Icon.Tag}
        accessories={[
          {
            tag: node.fullPath,
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title="View Notes"
              icon={Icon.Eye}
              onAction={() => onSelect(node.fullPath)}
            />
            <UtilityActionsSection />
          </ActionPanel>
        }
      />,
    );

    // Render children
    if (hasChildren) {
      items.push(...renderTagTree(node.children, onSelect, depth + 1));
    }
  });

  return items;
}

interface TagNotesViewProps {
  tag: string;
  onBack: () => void;
}

function TagNotesView({ tag, onBack }: TagNotesViewProps) {
  const { data: notes, isLoading, mutate } = useNotesByTag(tag);

  const handleTogglePin = async (noteId: string) => {
    try {
      await togglePin(noteId);
      await mutate();
      await showToast({
        style: Toast.Style.Success,
        title: "Pin toggled",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle pin",
        message: String(error),
      });
    }
  };

  const handleArchive = async (noteId: string) => {
    try {
      await archiveNote(noteId);
      await mutate();
      await showToast({
        style: Toast.Style.Success,
        title: "Note archived",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to archive note",
        message: String(error),
      });
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      await mutate();
      await showToast({
        style: Toast.Style.Success,
        title: "Note deleted",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete note",
        message: String(error),
      });
    }
  };

  const handleCopyLatest = async (noteId: string) => {
    try {
      const snippet = await fetchLatestSnippet(noteId);
      if (snippet) {
        await Clipboard.copy(snippet.content);
        await showToast({
          style: Toast.Style.Success,
          title: "Copied to clipboard",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy",
        message: String(error),
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Tag: ${tag}`}
      searchBarPlaceholder="Search notes..."
      actions={
        <ActionPanel>
          <Action
            title="Back to Tags"
            icon={Icon.ArrowLeft}
            onAction={onBack}
          />
        </ActionPanel>
      }
    >
      {!isLoading && (!notes || notes.length === 0) ? (
        <List.EmptyView
          title="No Notes"
          description={`No notes found with tag "${tag}"`}
          icon={Icon.Document}
        />
      ) : (
        (notes || []).map((note) => (
          <NoteListItem
            key={note.id}
            note={note}
            onTogglePin={handleTogglePin}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onCopyLatest={handleCopyLatest}
            mutate={mutate}
          />
        ))
      )}
    </List>
  );
}

export default function Command() {
  return (
    <AuthWrapper>
      <BrowseTagsContent />
    </AuthWrapper>
  );
}
