import { List, ActionPanel } from "@raycast/api";
import {
  readingTime,
  wordCount,
  trimPathToMaxLength,
  createdDateFor,
  fileSizeFor,
  filterContent,
} from "../../../utils/utils";
import { SearchNotePreferences } from "../../../utils/preferences";
import { NoteActions, OpenNoteActions, OpenPathInObsidianAction } from "../../../utils/actions";
import { useNoteContent } from "../../../utils/hooks";
import { useState } from "react";
import { Note, ObsidianVault, ObsidianUtils } from "@/obsidian";
import { ContentMatch, NoteSearchResult } from "@/api/search/content-match.service";
import { normalizeRelativePath } from "@/utils/utils";
import { shouldLoadNoteContentForList } from "@/api/search/note-preview.service";
import { MAX_SEARCH_FILE_SIZE_BYTES } from "@/api/search/simple-content-search.service";

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_[\]{}()<>#+.!|-])/g, "\\$1");
}

function highlightedLine(text: string, line: number, startColumn: number, match: ContentMatch): string {
  if (line < match.line || line > match.endLine) return escapeMarkdown(text);

  const start = line === match.line ? Math.max(0, match.column - startColumn) : 0;
  const end = line === match.endLine ? Math.min(text.length, match.endColumn - startColumn) : text.length;
  return `${escapeMarkdown(text.slice(0, start))}**${escapeMarkdown(text.slice(start, end))}**${escapeMarkdown(
    text.slice(end)
  )}`;
}

function matchPreview(note: Note, vault: ObsidianVault, match: ContentMatch): string {
  const relativePath = normalizeRelativePath(note.path, vault.path);
  const context = match.context
    .map((item) => `> \`${item.line}\` ${highlightedLine(item.text, item.line, item.startColumn, match) || " "}`)
    .join("\n>\n");

  return `# ${escapeMarkdown(note.title)}\n\n${escapeMarkdown(relativePath)}\n\n**Line ${match.line}, Column ${
    match.column
  }**\n\n---\n\n${context}`;
}

interface NoteListItemMetadataProps {
  content: string;
  note: Note;
  vault: ObsidianVault;
}

function NoteListItemMetadata({ content, note, vault }: NoteListItemMetadataProps) {
  const tags = ObsidianUtils.getAllTags(content);
  const url = ObsidianUtils.getProperty(content, "url");

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Character Count" text={content.length.toString()} />
      <List.Item.Detail.Metadata.Label title="Word Count" text={wordCount(content).toString()} />
      <List.Item.Detail.Metadata.Label title="Reading Time" text={readingTime(content).toString() + " min read"} />
      <List.Item.Detail.Metadata.TagList title="Tags">
        {tags.map((tag) => (
          <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
        ))}
      </List.Item.Detail.Metadata.TagList>
      {url && <List.Item.Detail.Metadata.Link target={url} text="View" title="URL" />}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Creation Date" text={createdDateFor(note).toLocaleDateString()} />
      <List.Item.Detail.Metadata.Label title="File Size" text={fileSizeFor(note).toFixed(2) + " KB"} />
      <List.Item.Detail.Metadata.Label
        title="Note Path"
        text={trimPathToMaxLength(note.path.split(vault.path)[1], 55)}
      />
    </List.Item.Detail.Metadata>
  );
}

export function NoteListItem(props: {
  result: NoteSearchResult;
  vault: ObsidianVault;
  pref: SearchNotePreferences;
  selectedItemId: string | null;
  onNoteUpdated?: (notePath: string, updates: Partial<Note>) => void;
  onDelete?: (note: Note, vault: ObsidianVault) => void;
}) {
  const { result, vault, pref, onNoteUpdated, onDelete } = props;
  const { note, match } = result;

  const [isBookmarked, setIsBookmarked] = useState(note.bookmarked);
  const isSelected = props.selectedItemId === result.id;
  const fileSize = note.fileSize;
  const isOversized = fileSize !== undefined && fileSize > MAX_SEARCH_FILE_SIZE_BYTES;
  const shouldBypassInlineContent = match === undefined && (fileSize === undefined || isOversized);
  const shouldLoadNoteContent =
    fileSize !== undefined && shouldLoadNoteContentForList(isSelected, match !== undefined, fileSize);
  const { noteContent, isLoading } = useNoteContent(note, { enabled: shouldLoadNoteContent });

  // Create a modified note object with the current bookmark state
  const updatedNote = { ...note, bookmarked: isBookmarked };

  return (
    <List.Item
      title={updatedNote.title}
      subtitle={match?.context.find((item) => item.line === match.line)?.text.trim()}
      id={result.id}
      accessories={[
        ...(match ? [{ text: `L${match.line}:${match.column}` }] : []),
        {
          icon: isBookmarked
            ? {
                source: "bookmark.svg",
              }
            : null,
        },
      ]}
      detail={
        shouldBypassInlineContent ? undefined : (
          <List.Item.Detail
            isLoading={isLoading}
            markdown={
              match
                ? matchPreview(note, vault, match)
                : noteContent
                ? ObsidianUtils.renderCallouts(filterContent(noteContent))
                : ""
            }
            metadata={
              noteContent && pref.showMetadata ? (
                <NoteListItemMetadata note={note} content={noteContent} vault={vault} />
              ) : null
            }
          />
        )
      }
      actions={
        <ActionPanel>
          {shouldBypassInlineContent ? (
            <OpenPathInObsidianAction path={updatedNote.path} />
          ) : (
            <OpenNoteActions note={updatedNote} vault={vault} match={match} />
          )}
          <NoteActions
            note={noteContent ? { content: noteContent, ...updatedNote } : updatedNote}
            vault={vault}
            onNoteAction={(actionType) => {
              switch (actionType) {
                case "bookmark":
                  setIsBookmarked(true);
                  break;
                case "unbookmark":
                  setIsBookmarked(false);
                  break;
              }
            }}
            onNoteUpdated={onNoteUpdated}
            onDelete={onDelete}
          />
        </ActionPanel>
      }
    />
  );
}
