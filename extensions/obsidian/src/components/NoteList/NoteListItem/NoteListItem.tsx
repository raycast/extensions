import { List, ActionPanel } from "@raycast/api";
import fs from "fs";
import {
  readingTime,
  wordCount,
  trimPathToMaxLength,
  createdDateFor,
  fileSizeFor,
  filterContent,
} from "../../../utils/utils";
import { SearchNotePreferences } from "../../../utils/preferences";
import { invalidateNotesCache } from "../../../api/cache/cache.service";
import { NoteActions, OpenNoteActions } from "../../../utils/actions";
import { useNoteContent } from "../../../utils/hooks";
import { useState } from "react";
import { Note, ObsidianVault, ObsidianUtils } from "@/obsidian";

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
  note: Note;
  vault: ObsidianVault;
  key: string;
  pref: SearchNotePreferences;
  selectedItemId: string | null;
  onNoteUpdated?: (notePath: string, updates: Partial<Note>) => void;
  onDelete?: (note: Note, vault: ObsidianVault) => void;
}) {
  const { note, vault, pref, onNoteUpdated, onDelete } = props;

  const [isBookmarked, setIsBookmarked] = useState(note.bookmarked);
  const isSelected = props.selectedItemId === note.path;
  const { noteContent, isLoading } = useNoteContent(note, { enabled: isSelected });

  const noteHasBeenMoved = !fs.existsSync(note.path);
  if (noteHasBeenMoved) {
    invalidateNotesCache(vault.path);
  }

  // Create a modified note object with the current bookmark state
  const updatedNote = { ...note, bookmarked: isBookmarked };

  if (noteHasBeenMoved) return null;

  return (
    <List.Item
      title={updatedNote.title}
      id={updatedNote.path}
      accessories={[
        {
          icon: isBookmarked
            ? {
                source: "bookmark.svg",
              }
            : null,
        },
      ]}
      detail={
        noteContent && (
          <List.Item.Detail
            isLoading={isLoading}
            markdown={ObsidianUtils.renderCallouts(filterContent(noteContent))}
            metadata={
              noteContent && pref.showMetadata ? (
                <NoteListItemMetadata note={note} content={noteContent} vault={vault} />
              ) : null
            }
          />
        )
      }
      actions={
        noteContent && (
          <ActionPanel>
            <OpenNoteActions note={{ content: noteContent, ...updatedNote }} vault={vault} />
            <NoteActions
              note={{ content: noteContent, ...updatedNote }}
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
        )
      }
    />
  );
}
