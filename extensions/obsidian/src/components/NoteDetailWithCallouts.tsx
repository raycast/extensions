import { Detail, ActionPanel } from "@raycast/api";
import React from "react";
import { Note } from "../api/vault/notes/notes.types";
import { Vault } from "../api/vault/vault.types";
import { renderMarkdown } from "../utils/renderMarkdown";

export function NoteDetailWithCallouts(props: { 
  note: Note; 
  vault: Vault; 
  actions?: React.ReactNode;
  isLoading?: boolean;
}) {
  const { note, actions, isLoading = false } = props;
  
  if (isLoading || !note) {
    return <Detail isLoading={true} />;
  }
  
  return (
    <Detail
      navigationTitle={note.title}
      markdown={renderMarkdown(note.content)}
      actions={actions ? <ActionPanel>{actions}</ActionPanel> : undefined}
    />
  );
}