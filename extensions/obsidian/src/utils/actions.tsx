import { Action, getPreferenceValues, Icon, Color } from "@raycast/api";

import React, { useState } from "react";

import { AppendNoteForm } from "../components/AppendNoteForm";
import { EditNote } from "../components/EditNote";
import { SearchNotePreferences, Note, Vault } from "./interfaces";
import { isNotePinned, pinNote, unpinNote } from "./pinNoteUtils";
import { NoteQuickLook } from "../components/NoteQuickLook";
import { deleteNote, appendSelectedTextTo } from "./utils";
import { NoteAction, PrimaryAction } from "./constants";

export function ShowNoteInFinderAction(props: { note: Note }) {
  const { note } = props;
  return (
    <Action.ShowInFinder
      title="Show in Finder"
      icon={Icon.Finder}
      path={note.path}
      shortcut={{ modifiers: ["opt"], key: "enter" }}
    />
  );
}

export function EditNoteAction(props: { note: Note; vault: Vault; actionCallback: (action: NoteAction) => void }) {
  const { note, vault, actionCallback } = props;
  return (
    <Action.Push
      title="Edit Note"
      target={<EditNote note={note} vault={vault} actionCallback={actionCallback} />}
      shortcut={{ modifiers: ["opt"], key: "e" }}
      icon={Icon.Pencil}
    />
  );
}

export function AppendToNoteAction(props: { note: Note; actionCallback: (action: NoteAction) => void }) {
  const { note, actionCallback } = props;
  return (
    <Action.Push
      title="Append to Note"
      target={<AppendNoteForm note={note} actionCallback={actionCallback} />}
      shortcut={{ modifiers: ["opt"], key: "a" }}
      icon={Icon.Pencil}
    />
  );
}

export function AppendSelectedTextToNoteAction(props: { note: Note; actionCallback: (action: NoteAction) => void }) {
  const { note, actionCallback } = props;
  return (
    <Action
      title="Append Selected Text to Note"
      shortcut={{ modifiers: ["opt"], key: "s" }}
      onAction={async () => {
        let done = await appendSelectedTextTo(note);
        if (done) {
          actionCallback(NoteAction.Append);
        }
      }}
      icon={Icon.Pencil}
    />
  );
}

export function CopyNoteAction(props: { note: Note }) {
  const { note } = props;
  return (
    <Action.CopyToClipboard
      title="Copy Note Content"
      content={note.content}
      shortcut={{ modifiers: ["opt"], key: "c" }}
    />
  );
}

export function PasteNoteAction(props: { note: Note }) {
  const { note } = props;
  return <Action.Paste title="Paste Note Content" content={note.content} shortcut={{ modifiers: ["opt"], key: "v" }} />;
}

export function CopyMarkdownLinkAction(props: { note: Note }) {
  const { note } = props;
  const URIEncodedPath = encodeURIComponent(note.path);
  return (
    <Action.CopyToClipboard
      title="Copy Markdown Link"
      icon={Icon.Link}
      content={`[${note.title}](obsidian://open?path=${URIEncodedPath})`}
      shortcut={{ modifiers: ["opt"], key: "l" }}
    />
  );
}

export function CopyObsidianURIAction(props: { note: Note }) {
  const { note } = props;
  const URIEncodedPath = encodeURIComponent(note.path);
  return (
    <Action.CopyToClipboard
      title="Copy Obsidian URI"
      icon={Icon.Link}
      content={`obsidian://open?path=${URIEncodedPath}`}
      shortcut={{ modifiers: ["opt"], key: "u" }}
    />
  );
}

export function PinNoteAction(props: { note: Note; vault: Vault; actionCallback: (action: NoteAction) => void }) {
  const { note, vault, actionCallback } = props;
  const [pinned, setPinned] = useState(isNotePinned(note, vault));
  return (
    <Action
      title={pinned ? "Unpin Note" : "Pin Note"}
      shortcut={{ modifiers: ["opt"], key: "p" }}
      onAction={() => {
        if (pinned) {
          unpinNote(note, vault);
          setPinned(!pinned);
          actionCallback(NoteAction.Pin);
        } else {
          pinNote(note, vault);
          setPinned(!pinned);
          actionCallback(NoteAction.Pin);
        }
      }}
      icon={pinned ? Icon.XmarkCircle : Icon.Pin}
    />
  );
}

export function DeleteNoteAction(props: { note: Note; vault: Vault; actionCallback: (action: NoteAction) => void }) {
  const { note, vault, actionCallback } = props;
  return (
    <Action
      title="Delete Note"
      shortcut={{ modifiers: ["opt"], key: "d" }}
      onAction={async () => {
        const deleted = await deleteNote(note, vault);
        if (deleted) {
          actionCallback(NoteAction.Delete);
        }
      }}
      icon={{ source: Icon.Trash, tintColor: Color.Red }}
    />
  );
}

export function QuickLookAction(props: { note: Note; vault: Vault; actionCallback: (action: NoteAction) => void }) {
  const { note, vault, actionCallback } = props;
  return (
    <Action.Push
      title="Quick Look"
      target={<NoteQuickLook note={note} vault={vault} actionCallback={props.actionCallback} />}
      icon={Icon.Eye}
    />
  );
}

export function OpenInObsidianAction(props: { note: Note }) {
  const { note } = props;
  return (
    <Action.Open
      title="Open in Obsidian"
      target={"obsidian://open?path=" + encodeURIComponent(note.path)}
      icon={Icon.TextDocument}
    />
  );
}

export function ShowVaultInFinderAction(props: { vault: Vault }) {
  const { vault } = props;
  return <Action.ShowInFinder title="Show in Finder" icon={Icon.Finder} path={vault.path} />;
}

export function NoteActions(props: { note: Note; vault: Vault; actionCallback: (action: NoteAction) => void }) {
  const { note, vault, actionCallback } = props;

  return (
    <React.Fragment>
      <ShowNoteInFinderAction note={note} />
      <EditNoteAction note={note} vault={vault} actionCallback={actionCallback} />
      <AppendToNoteAction note={note} actionCallback={actionCallback} />
      <AppendSelectedTextToNoteAction note={note} actionCallback={actionCallback} />
      <CopyNoteAction note={note} />
      <PasteNoteAction note={note} />
      <CopyMarkdownLinkAction note={note} />
      <CopyObsidianURIAction note={note} />
      <PinNoteAction note={note} vault={vault} actionCallback={actionCallback} />
      <DeleteNoteAction note={note} vault={vault} actionCallback={actionCallback} />
    </React.Fragment>
  );
}

export function OpenNoteActions(props: { note: Note; vault: Vault; actionCallback: (action: NoteAction) => void }) {
  const { note, vault, actionCallback } = props;
  const { primaryAction } = getPreferenceValues<SearchNotePreferences>();

  const quicklook = <QuickLookAction note={note} vault={vault} actionCallback={actionCallback} />;
  const obsidian = <OpenInObsidianAction note={note} />;

  if (primaryAction == PrimaryAction.QuickLook) {
    return (
      <React.Fragment>
        {quicklook}
        {obsidian}
      </React.Fragment>
    );
  } else if (primaryAction == PrimaryAction.OpenInObsidian) {
    return (
      <React.Fragment>
        {obsidian}
        {quicklook}
      </React.Fragment>
    );
  } else {
    return (
      <React.Fragment>
        {quicklook}
        {obsidian}
      </React.Fragment>
    );
  }
}
