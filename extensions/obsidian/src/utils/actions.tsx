import { Action, getPreferenceValues, Icon, Color, List, ActionPanel } from "@raycast/api";

import React, { useState } from "react";

import { AppendNoteForm } from "../components/AppendNoteForm";
import { EditNote } from "../components/EditNote";
import { SearchNotePreferences, Note, Vault } from "./interfaces";
import { isNotePinned, pinNote, unpinNote } from "./pinNoteUtils";
import { NoteQuickLook } from "../components/NoteQuickLook";
import {
  deleteNote,
  appendSelectedTextTo,
  getOpenPathInObsidianTarget,
  vaultPluginCheck,
  getCodeBlocks,
} from "./utils";
import { NoteAction, ObsidianIconDynamicBold, PrimaryAction } from "./constants";
import { NoteList } from "../components/NoteList/NoteList";
import { useNotes } from "./cache";

//--------------------------------------------------------------------------------
// All actions for all commands should be defined here.
//--------------------------------------------------------------------------------

export function ShowPathInFinderAction(props: { path: string }) {
  const { path } = props;
  return (
    <Action.ShowInFinder
      title="Show in Finder"
      icon={Icon.Finder}
      path={path}
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
        const done = await appendSelectedTextTo(note);
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

  return (
    <Action.CopyToClipboard
      title="Copy Markdown Link"
      icon={Icon.Link}
      content={`[${note.title}](${getOpenPathInObsidianTarget(note.path)})`}
      shortcut={{ modifiers: ["opt"], key: "l" }}
    />
  );
}

export function CopyObsidianURIAction(props: { note: Note }) {
  const { note } = props;

  return (
    <Action.CopyToClipboard
      title="Copy Obsidian URI"
      icon={Icon.Link}
      content={getOpenPathInObsidianTarget(note.path)}
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
      icon={pinned ? Icon.XMarkCircle : Icon.Pin}
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

export function QuickLookAction(props: {
  note: Note;
  notes: Note[];
  vault: Vault;
  actionCallback: (action: NoteAction) => void;
}) {
  const { note, notes, vault, actionCallback } = props;
  return (
    <Action.Push
      title="Quick Look"
      target={
        <NoteQuickLook note={note} notes={notes} vault={vault} showTitle={true} actionCallback={actionCallback} />
      }
      icon={Icon.Eye}
    />
  );
}

export function OpenPathInObsidianAction(props: { path: string }) {
  const { path } = props;
  return (
    <Action.Open title="Open in Obsidian" target={getOpenPathInObsidianTarget(path)} icon={ObsidianIconDynamicBold} />
  );
}

export function OpenNoteInObsidianNewPaneAction(props: { note: Note; vault: Vault }) {
  const { note, vault } = props;

  return (
    <Action.Open
      title="Open in new Pane"
      target={
        "obsidian://advanced-uri?vault=" +
        encodeURIComponent(vault.name) +
        "&filepath=" +
        encodeURIComponent(note.path.replace(vault.path, "")) +
        "&newpane=true"
      }
      icon={ObsidianIconDynamicBold}
    />
  );
}

export function ShowVaultInFinderAction(props: { vault: Vault }) {
  const { vault } = props;
  return <Action.ShowInFinder title="Show in Finder" icon={Icon.Finder} path={vault.path} />;
}

export function ShowMentioningNotesAction(props: { vault: Vault; str: string; notes: Note[] }) {
  const { vault, str, notes } = props;
  const filteredNotes = notes.filter((note: Note) => note.content.includes(str));
  const count = filteredNotes.length;
  if (count > 0) {
    const list = (
      <NoteList
        vault={vault}
        notes={filteredNotes}
        searchArguments={{ searchArgument: "", tagArgument: "" }}
        title={`${count} notes mentioning "${str}"`}
        action={(note: Note, vault: Vault, actionCallback: (action: NoteAction) => void) => {
          return (
            <React.Fragment>
              <OpenNoteActions note={note} notes={notes} vault={vault} actionCallback={actionCallback} />
              <NoteActions note={note} notes={notes} vault={vault} actionCallback={actionCallback} />
            </React.Fragment>
          );
        }}
      />
    );
    return <Action.Push title={`Show Mentioning Notes (${count})`} target={list} icon={Icon.Megaphone} />;
  } else {
    return <React.Fragment></React.Fragment>;
  }
}

export function CopyCodeAction(props: { note: Note }) {
  const { note } = props;
  const codeBlocks = getCodeBlocks(note.content);

  if (codeBlocks.length === 1) {
    const codeBlock = codeBlocks[0];
    return (
      <React.Fragment>
        <Action.Paste title="Paste Code" icon={Icon.Code} content={codeBlock.code} />
        <Action.CopyToClipboard title="Copy Code" icon={Icon.Code} content={codeBlock.code} />
      </React.Fragment>
    );
  } else if (codeBlocks.length > 1) {
    return (
      <Action.Push
        title="Copy Code"
        icon={Icon.Code}
        target={
          <List isShowingDetail={true}>
            {codeBlocks?.map((codeBlock) => (
              <List.Item
                title={codeBlock.code}
                detail={<List.Item.Detail markdown={"```\n" + codeBlock.code + "```"} />}
                subtitle={codeBlock.language}
                key={codeBlock.code}
                actions={
                  <ActionPanel>
                    <Action.Paste title="Paste Code" icon={Icon.Code} content={codeBlock.code} />
                    <Action.CopyToClipboard title="Copy Code" icon={Icon.Code} content={codeBlock.code} />
                  </ActionPanel>
                }
              />
            ))}
          </List>
        }
      />
    );
  } else {
    return <React.Fragment></React.Fragment>;
  }
}

export function NoteActions(props: {
  notes: Note[];
  note: Note;
  vault: Vault;
  actionCallback: (action: NoteAction) => void;
}) {
  const { notes, note, vault, actionCallback } = props;

  return (
    <React.Fragment>
      <ShowPathInFinderAction path={note.path} />
      <ShowMentioningNotesAction vault={vault} str={note.title} notes={notes} />
      <CopyCodeAction note={note} />
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

export function OpenNoteActions(props: {
  note: Note;
  notes: Note[];
  vault: Vault;
  actionCallback: (action: NoteAction) => void;
}) {
  const { note, notes, vault, actionCallback } = props;
  const { primaryAction } = getPreferenceValues<SearchNotePreferences>();

  const [vaultsWithPlugin, _] = vaultPluginCheck([vault], "obsidian-advanced-uri");

  const quicklook = <QuickLookAction note={note} notes={notes} vault={vault} actionCallback={actionCallback} />;
  const obsidian = <OpenPathInObsidianAction path={note.path} />;
  const obsidianNewPane = vaultsWithPlugin.includes(vault) ? (
    <OpenNoteInObsidianNewPaneAction note={note} vault={vault} />
  ) : null;

  if (primaryAction == PrimaryAction.QuickLook) {
    return (
      <React.Fragment>
        {quicklook}
        {obsidian}
        {obsidianNewPane}
      </React.Fragment>
    );
  } else if (primaryAction == PrimaryAction.OpenInObsidian) {
    return (
      <React.Fragment>
        {obsidian}
        {obsidianNewPane}
        {quicklook}
      </React.Fragment>
    );
  } else if (primaryAction == PrimaryAction.OpenInObsidianNewPane) {
    return (
      <React.Fragment>
        {obsidianNewPane}
        {obsidian}
        {quicklook}
      </React.Fragment>
    );
  } else {
    return (
      <React.Fragment>
        {obsidian}
        {obsidianNewPane}
        {quicklook}
      </React.Fragment>
    );
  }
}
