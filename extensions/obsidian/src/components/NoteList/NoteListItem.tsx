import { List, ActionPanel } from "@raycast/api";
import React, { useState } from "react";
import fs from "fs";

import { Note, Vault, SearchNotePreferences } from "../../utils/interfaces";
import {
  readingTime,
  wordCount,
  trimPath,
  createdDateFor,
  fileSizeFor,
  getNoteFileContent,
  filterContent,
} from "../../utils/utils";
import { isNotePinned } from "../../utils/pinNoteUtils";
import { NoteAction } from "../../utils/constants";
import { deleteNoteFromCache, renewCache, updateNoteInCache } from "../../utils/cache";
import { tagsForNotes, yamlPropertyForString } from "../../utils/yaml";

export function NoteListItem(props: {
  note: Note;
  vault: Vault;
  key: string;
  pref: SearchNotePreferences;
  action?: (note: Note, vault: Vault, actionCallback: (action: NoteAction) => void) => React.ReactFragment;
  onDelete?: (note: Note, vault: Vault) => void;
}) {
  const { note, vault, pref, onDelete, action } = props;
  const [content, setContent] = useState(note.content);
  const [pinned, setPinned] = useState(isNotePinned(note, vault));

  const noteHasBeenMoved = !fs.existsSync(note.path);

  if (noteHasBeenMoved) {
    renewCache(vault);
  }

  function reloadContent() {
    const newContent = getNoteFileContent(note.path);
    note.content = newContent;
    setContent(newContent);
  }

  function reloadTags() {
    const newTags = tagsForNotes([note]);
    note.tags = newTags;
  }

  function actionCallback(action: NoteAction) {
    switch (+action) {
      case NoteAction.Pin:
        setPinned(!pinned);
        break;
      case NoteAction.Delete:
        if (onDelete) {
          onDelete(note, vault);
        }
        deleteNoteFromCache(vault, note);
        break;
      case NoteAction.Edit:
        reloadContent();
        reloadTags();
        updateNoteInCache(vault, note);
        break;
      case NoteAction.Append:
        reloadContent();
        reloadTags();
        updateNoteInCache(vault, note);
    }
  }

  function TagList() {
    if (note.tags.length > 0) {
      return (
        <List.Item.Detail.Metadata.TagList title="Tags">
          {note.tags.map((tag) => (
            <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
          ))}
        </List.Item.Detail.Metadata.TagList>
      );
    } else {
      return null;
    }
  }

  function Link() {
    const url = yamlPropertyForString(note.content, "url");
    if (url) {
      return <List.Item.Detail.Metadata.Link target={url} text="View" title="URL" />;
    } else {
      return null;
    }
  }

  return !noteHasBeenMoved ? (
    <List.Item
      title={note.title}
      accessories={[{ text: pinned ? "⭐️" : "" }]}
      detail={
        <List.Item.Detail
          markdown={filterContent(content)}
          metadata={
            pref.showMetadata ? (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Character Count" text={content.length.toString()} />
                <List.Item.Detail.Metadata.Label title="Word Count" text={wordCount(content).toString()} />
                <List.Item.Detail.Metadata.Label
                  title="Reading Time"
                  text={readingTime(content).toString() + " min read"}
                />
                <TagList />
                <Link />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Creation Date"
                  text={createdDateFor(note).toLocaleDateString()}
                />
                <List.Item.Detail.Metadata.Label title="File Size" text={fileSizeFor(note).toFixed(2) + " KB"} />
                <List.Item.Detail.Metadata.Label
                  title="Note Path"
                  text={trimPath(note.path.split(vault.path)[1], 55)}
                />
              </List.Item.Detail.Metadata>
            ) : (
              <React.Fragment />
            )
          }
        />
      }
      actions={
        <ActionPanel>
          <React.Fragment>{action && action(note, vault, actionCallback)}</React.Fragment>
        </ActionPanel>
      }
    />
  ) : null;
}
