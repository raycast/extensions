import {
  Action,
  ActionPanel,
  Color,
  confirmAlert,
  getDefaultApplication,
  getPreferenceValues,
  Icon,
  List,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import { appendSelectedTextTo, getCodeBlocks } from "../api/vault/notes/notes.service";
import { Note } from "../api/vault/notes/notes.types";
import { vaultPluginCheck } from "../api/vault/plugins/plugins.service";
import { Vault } from "../api/vault/vault.types";
import { AppendNoteForm } from "../components/AppendNoteForm";
import { EditNote } from "../components/EditNote";
import { NoteList } from "../components/NoteList/NoteList";
import { NoteQuickLook } from "../components/NoteQuickLook";
import { ObsidianIcon, PrimaryAction } from "./constants";
import { useNotesDispatchContext } from "./hooks";
import { SearchNotePreferences } from "./preferences";
import { NoteReducerActionType } from "./reducers";
import { getObsidianTarget, ObsidianTargetType } from "./utils";

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

export function EditNoteAction(props: { note: Note; vault: Vault }) {
  const { note, vault } = props;
  const dispatch = useNotesDispatchContext();

  return (
    <Action.Push
      title="Edit Note"
      target={<EditNote note={note} vault={vault} dispatch={dispatch} />}
      shortcut={{ modifiers: ["opt"], key: "e" }}
      icon={Icon.Pencil}
    />
  );
}

export function AppendToNoteAction(props: { note: Note; vault: Vault }) {
  const { note, vault } = props;
  const dispatch = useNotesDispatchContext();

  return (
    <Action.Push
      title="Append to Note"
      target={<AppendNoteForm note={note} vault={vault} dispatch={dispatch} />}
      shortcut={{ modifiers: ["opt"], key: "a" }}
      icon={Icon.Pencil}
    />
  );
}

export function AppendSelectedTextToNoteAction(props: { note: Note; vault: Vault }) {
  const { note, vault } = props;
  const dispatch = useNotesDispatchContext();
  return (
    <Action
      title="Append Selected Text to Note"
      shortcut={{ modifiers: ["opt"], key: "s" }}
      onAction={async () => {
        const done = await appendSelectedTextTo(note);
        if (done) {
          dispatch({ type: NoteReducerActionType.Update, payload: { note: note, vault: vault } });
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

export function CopyNoteTitleAction(props: { note: Note }) {
  const { note } = props;
  return (
    <Action.CopyToClipboard title="Copy Note Title" content={note.title} shortcut={{ modifiers: ["opt"], key: "t" }} />
  );
}

export function PasteNoteAction(props: { note: Note }) {
  const { note } = props;
  return <Action.Paste title="Paste Note Content" content={note.content} shortcut={{ modifiers: ["opt"], key: "v" }} />;
}

export function CopyMarkdownLinkAction(props: { note: Note }) {
  const { note } = props;
  const target = getObsidianTarget({ type: ObsidianTargetType.OpenPath, path: note.path });

  return (
    <Action.CopyToClipboard
      title="Copy Markdown Link"
      icon={Icon.Link}
      content={`[${note.title}](${target})`}
      shortcut={{ modifiers: ["opt"], key: "l" }}
    />
  );
}

export function CopyObsidianURIAction(props: { note: Note }) {
  const { note } = props;
  const target = getObsidianTarget({ type: ObsidianTargetType.OpenPath, path: note.path });

  return (
    <Action.CopyToClipboard
      title="Copy Obsidian Link"
      icon={Icon.Link}
      content={target}
      shortcut={{ modifiers: ["opt"], key: "u" }}
    />
  );
}

export function DeleteNoteAction(props: { note: Note; vault: Vault }) {
  const { note, vault } = props;
  const dispatch = useNotesDispatchContext();
  return (
    <Action
      title="Delete Note"
      shortcut={{ modifiers: ["opt"], key: "d" }}
      onAction={async () => {
        const options = {
          title: "Delete Note",
          message: 'Are you sure you want to delete the note: "' + note.title + '"?',
          icon: Icon.ExclamationMark,
        };
        if (await confirmAlert(options)) {
          dispatch({ type: NoteReducerActionType.Delete, payload: { note: note, vault: vault } });
        }
      }}
      icon={{ source: Icon.Trash, tintColor: Color.Red }}
    />
  );
}

export function QuickLookAction(props: { note: Note; notes: Note[]; vault: Vault }) {
  const { note, notes, vault } = props;
  return (
    <Action.Push
      title="Quick Look"
      target={<NoteQuickLook note={note} showTitle={true} allNotes={notes} vault={vault} />}
      icon={Icon.Eye}
    />
  );
}

export function OpenInDefaultAppAction(props: { note: Note; notes: Note[]; vault: Vault }) {
  const { note } = props;
  const [defaultApp, setDefaultApp] = useState<string>("Default App");
  useEffect(() => {
    getDefaultApplication(note.path)
      .then((app) => setDefaultApp(app.name))
      .catch((err) => {
        console.error(err);
        setDefaultApp("");
      });
  }, [note.path]);

  if (!defaultApp) return null;
  return <Action.Open title={`Open in ${defaultApp}`} target={note.path} icon={Icon.AppWindow} />;
}

export function BookmarkNoteAction(props: { note: Note; vault: Vault }) {
  const { note, vault } = props;
  const dispatch = useNotesDispatchContext();
  return (
    <Action
      title="Bookmark Note"
      shortcut={{ modifiers: ["opt"], key: "p" }}
      onAction={() => {
        dispatch({ type: NoteReducerActionType.Bookmark, payload: { note: note, vault: vault } });
      }}
      icon={Icon.Bookmark}
    />
  );
}

export function UnbookmarkNoteAction(props: { note: Note; vault: Vault }) {
  const { note, vault } = props;
  const dispatch = useNotesDispatchContext();
  return (
    <Action
      title="Unbookmark Note"
      shortcut={{ modifiers: ["opt"], key: "p" }}
      onAction={() => {
        dispatch({ type: NoteReducerActionType.Unbookmark, payload: { note: note, vault: vault } });
      }}
      icon={Icon.Bookmark}
    />
  );
}

export function OpenPathInObsidianAction(props: { path: string }) {
  const { path } = props;
  const target = getObsidianTarget({ type: ObsidianTargetType.OpenPath, path: path });
  return <Action.Open title="Open in Obsidian" target={target} icon={ObsidianIcon} />;
}

export function OpenNoteInObsidianNewPaneAction(props: { note: Note; vault: Vault }) {
  const { note, vault } = props;

  return (
    <Action.Open
      title="Open in New Obsidian Tab"
      target={
        "obsidian://advanced-uri?vault=" +
        encodeURIComponent(vault.name) +
        "&filepath=" +
        encodeURIComponent(note.path.replace(vault.path, "")) +
        "&newpane=true"
      }
      icon={ObsidianIcon}
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
        action={(note: Note, vault: Vault) => {
          return (
            <React.Fragment>
              <OpenNoteActions note={note} notes={notes} vault={vault} />
              <NoteActions note={note} notes={notes} vault={vault} />
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

export function NoteActions(props: { notes: Note[]; note: Note; vault: Vault }) {
  const { notes, note, vault } = props;

  return (
    <React.Fragment>
      <ShowPathInFinderAction path={note.path} />
      <ShowMentioningNotesAction vault={vault} str={note.title} notes={notes} />
      {note.bookmarked ? (
        <UnbookmarkNoteAction note={note} vault={vault} />
      ) : (
        <BookmarkNoteAction note={note} vault={vault} />
      )}
      <CopyCodeAction note={note} />
      <EditNoteAction note={note} vault={vault} />
      <AppendToNoteAction note={note} vault={vault} />
      <AppendSelectedTextToNoteAction note={note} vault={vault} />
      <CopyNoteAction note={note} />
      <CopyNoteTitleAction note={note} />
      <PasteNoteAction note={note} />
      <CopyMarkdownLinkAction note={note} />
      <CopyObsidianURIAction note={note} />
      <DeleteNoteAction note={note} vault={vault} />
      <AppendTaskAction note={note} vault={vault} />
    </React.Fragment>
  );
}

export function OpenNoteActions(props: { note: Note; notes: Note[]; vault: Vault }) {
  const { note, notes, vault } = props;
  const { primaryAction } = getPreferenceValues<SearchNotePreferences>();

  const [vaultsWithPlugin] = vaultPluginCheck([vault], "obsidian-advanced-uri");

  const quicklook = <QuickLookAction note={note} notes={notes} vault={vault} />;
  const openInDefaultApp = <OpenInDefaultAppAction note={note} notes={notes} vault={vault} />;
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
        {openInDefaultApp}
      </React.Fragment>
    );
  } else if (primaryAction == PrimaryAction.OpenInObsidian) {
    return (
      <React.Fragment>
        {obsidian}
        {obsidianNewPane}
        {openInDefaultApp}
        {quicklook}
      </React.Fragment>
    );
  } else if (primaryAction == PrimaryAction.OpenInDefaultApp) {
    return (
      <React.Fragment>
        {openInDefaultApp}
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
        {openInDefaultApp}
      </React.Fragment>
    );
  } else {
    return (
      <React.Fragment>
        {obsidian}
        {obsidianNewPane}
        {quicklook}
        {openInDefaultApp}
      </React.Fragment>
    );
  }
}

export function AppendTaskAction(props: { note: Note; vault: Vault }) {
  const { note, vault } = props;
  const dispatch = useNotesDispatchContext();

  return (
    <Action.Push
      title="Append Task"
      target={<AppendNoteForm note={note} vault={vault} dispatch={dispatch} />}
      shortcut={{ modifiers: ["opt"], key: "a" }}
      icon={Icon.Pencil}
    />
  );
}
