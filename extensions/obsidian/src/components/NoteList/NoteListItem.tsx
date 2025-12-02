import { List, ActionPanel } from "@raycast/api";
import React from "react";
import fs from "fs";

import { readingTime, wordCount, trimPathToMaxLength, createdDateFor, fileSizeFor } from "../../utils/utils";
import { yamlPropertyForString } from "../../utils/yaml";
import { SearchNotePreferences } from "../../utils/preferences";
import { Note } from "../../api/vault/notes/notes.types";
import { Vault } from "../../api/vault/vault.types";
import { filterContent } from "../../api/vault/vault.service";
import { renewCache } from "../../api/cache/cache.service";

export function NoteListItem(props: {
  note: Note;
  vault: Vault;
  key: string;
  pref: SearchNotePreferences;
  action?: (note: Note, vault: Vault) => React.ReactNode;
}) {
  const { note, vault, pref, action } = props;

  const noteHasBeenMoved = !fs.existsSync(note.path);

  if (noteHasBeenMoved) {
    renewCache(vault);
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
      accessories={[
        {
          icon: note.bookmarked
            ? {
                source: "bookmark.svg",
              }
            : null,
        },
      ]}
      detail={
        <List.Item.Detail
          markdown={filterContent(note.content)}
          metadata={
            pref.showMetadata ? (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Character Count" text={note.content.length.toString()} />
                <List.Item.Detail.Metadata.Label title="Word Count" text={wordCount(note.content).toString()} />
                <List.Item.Detail.Metadata.Label
                  title="Reading Time"
                  text={readingTime(note.content).toString() + " min read"}
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
                  text={trimPathToMaxLength(note.path.split(vault.path)[1], 55)}
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
          <React.Fragment>{action && action(note, vault)}</React.Fragment>
        </ActionPanel>
      }
    />
  ) : null;
}
