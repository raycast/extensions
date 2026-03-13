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
import fs from "fs";
import { AppendNoteForm } from "../components/AppendNoteForm";
import { EditNote } from "../components/EditNote";
import { NoteQuickLook } from "../components/NoteQuickLook";
import { ObsidianIcon, PrimaryAction } from "./constants";
import { SearchNotePreferences } from "./preferences";
import { updateNoteInCache, deleteNoteFromCache } from "../api/cache/cache.service";
import { Logger } from "../api/logger/logger.service";
import { Note, NoteWithContent, Obsidian, ObsidianTargetType, ObsidianVault, Vault } from "@/obsidian";
import { getCodeBlocks } from "./utils";
import { useVaultPluginCheck } from "./hooks";
import { appendSelectedTextTo } from "@/api/append-note";

const logger = new Logger("Actions");

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

export function CopyPathAction(props: { path: string }) {
  const { path } = props;
  return (
    <Action.CopyToClipboard
      title="Copy File Path"
      content={path}
      shortcut={{ modifiers: ["opt", "shift"], key: "c" }}
    />
  );
}

export function EditNoteAction(props: {
  note: NoteWithContent;
  vault: ObsidianVault;
  onNoteUpdated?: (notePath: string, updates: Partial<Note>) => void;
}) {
  const { note, vault, onNoteUpdated } = props;

  return (
    <Action.Push
      title="Edit Note"
      target={<EditNote note={note} vault={vault} onNoteUpdated={onNoteUpdated} />}
      shortcut={{ modifiers: ["opt"], key: "e" }}
      icon={Icon.Pencil}
    />
  );
}

export function AppendToNoteAction(props: {
  note: Note;
  vault: ObsidianVault;
  onNoteUpdated?: (notePath: string, updates: Partial<Note>) => void;
}) {
  const { note, vault, onNoteUpdated } = props;

  return (
    <Action.Push
      title="Append to Note"
      target={<AppendNoteForm note={note} vault={vault} onNoteUpdated={onNoteUpdated} />}
      shortcut={{ modifiers: ["opt"], key: "a" }}
      icon={Icon.Pencil}
    />
  );
}

export function AppendSelectedTextToNoteAction(props: {
  note: Note;
  vault: ObsidianVault;
  onNoteUpdated?: (notePath: string, updates: Partial<Note>) => void;
}) {
  const { note, vault, onNoteUpdated } = props;
  return (
    <Action
      title="Append Selected Text to Note"
      shortcut={{ modifiers: ["opt"], key: "s" }}
      onAction={async () => {
        const done = await appendSelectedTextTo(note);
        if (done) {
          // Update cache with new metadata
          const stats = fs.statSync(note.path);
          const updates = { lastModified: stats.mtime };
          updateNoteInCache(vault.path, note.path, updates);
          onNoteUpdated?.(note.path, updates);
        }
      }}
      icon={Icon.Pencil}
    />
  );
}

export function CopyNoteAction(props: { note: NoteWithContent }) {
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

export function CopyNotePathAction(props: { note: Note }) {
  const { note } = props;
  return (
    <Action.CopyToClipboard
      title="Copy File Path"
      content={note.path}
      shortcut={{ modifiers: ["opt", "shift"], key: "c" }}
    />
  );
}

export function PasteNoteAction(props: { note: NoteWithContent }) {
  const { note } = props;
  return <Action.Paste title="Paste Note Content" content={note.content} shortcut={{ modifiers: ["opt"], key: "v" }} />;
}

export function CopyMarkdownLinkAction(props: { note: Note }) {
  const { note } = props;
  const target = Obsidian.getTarget({ type: ObsidianTargetType.OpenPath, path: note.path });

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
  const target = Obsidian.getTarget({ type: ObsidianTargetType.OpenPath, path: note.path });

  return (
    <Action.CopyToClipboard
      title="Copy Obsidian Link"
      icon={Icon.Link}
      content={target}
      shortcut={{ modifiers: ["opt"], key: "u" }}
    />
  );
}

export function DeleteNoteAction(props: {
  note: Note;
  vault: ObsidianVault;
  onDelete?: (note: Note, vault: ObsidianVault) => void;
}) {
  const { note, vault, onDelete } = props;
  const logger = new Logger("DeleteNoteAction");
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
          // Delete the file
          Vault.deleteNote(note);

          // Update cache
          deleteNoteFromCache(vault.path, note.path);

          // Notify parent component
          onDelete?.(note, vault);

          logger.info(`Successfully deleted note: ${note.path}`);
        }
      }}
      icon={{ source: Icon.Trash, tintColor: Color.Red }}
    />
  );
}

export function QuickLookAction(props: { note: NoteWithContent; vault: ObsidianVault }) {
  const { note, vault } = props;
  return (
    <Action.Push
      title="Quick Look"
      target={<NoteQuickLook note={note} showTitle={true} vault={vault} />}
      icon={Icon.Eye}
    />
  );
}

export function OpenInDefaultAppAction(props: { note: Note; vault: ObsidianVault }) {
  const { note } = props;
  const [defaultApp, setDefaultApp] = useState<string>("Default App");
  useEffect(() => {
    getDefaultApplication(note.path)
      .then((app) => setDefaultApp(app.name))
      .catch((err) => {
        logger.warning(`No default app for ${note.path}: ${err}`);
        setDefaultApp("");
      });
  }, [note.path]);

  if (!defaultApp) return null;
  return <Action.Open title={`Open in ${defaultApp}`} target={note.path} icon={Icon.AppWindow} />;
}

export function BookmarkNoteAction(props: { note: Note; vault: ObsidianVault; onBookmark?: () => void }) {
  const { note, vault, onBookmark } = props;
  const { configFileName } = getPreferenceValues();

  return (
    <Action
      title="Bookmark Note"
      shortcut={{ modifiers: ["opt"], key: "p" }}
      onAction={() => {
        Vault.bookmarkNote(vault.path, note, configFileName);
        onBookmark?.();
      }}
      icon={Icon.Bookmark}
    />
  );
}

export function UnbookmarkNoteAction(props: { note: Note; vault: ObsidianVault; onUnbookmark?: () => void }) {
  const { note, vault, onUnbookmark } = props;
  const { configFileName } = getPreferenceValues();

  return (
    <Action
      title="Unbookmark Note"
      shortcut={{ modifiers: ["opt"], key: "p" }}
      onAction={() => {
        Vault.unbookmarkNote(vault.path, note, configFileName);
        onUnbookmark?.();
      }}
      icon={Icon.Bookmark}
    />
  );
}

export function OpenPathInObsidianAction(props: { path: string }) {
  const { path } = props;
  const target = Obsidian.getTarget({ type: ObsidianTargetType.OpenPath, path: path });
  return <Action.Open title="Open in Obsidian" target={target} icon={ObsidianIcon} />;
}

export function OpenNoteInObsidianNewPaneAction(props: { note: Note; vault: ObsidianVault }) {
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

export function ShowVaultInFinderAction(props: { vault: ObsidianVault }) {
  const { vault } = props;
  return <Action.ShowInFinder title="Show in Finder" icon={Icon.Finder} path={vault.path} />;
}

export function CopyVaultPathAction(props: { vault: ObsidianVault }) {
  const { vault } = props;
  return (
    <Action.CopyToClipboard
      title="Copy File Path"
      content={vault.path}
      shortcut={{ modifiers: ["opt", "shift"], key: "c" }}
    />
  );
}

// export function ShowMentioningNotesAction(props: { vault: Vault; str: string; notes: Note[] }) {
//   const { vault, str, notes } = props;
//   const filteredNotes = notes.filter((note: Note) => note.content.includes(str));
//   const count = filteredNotes.length;
//   if (count > 0) {
//     const list = (
//       <NoteList
//         vault={vault}
//         notes={filteredNotes}
//         searchArguments={{ searchArgument: "", tagArgument: "" }}
//         title={`${count} notes mentioning "${str}"`}
//         action={(note: Note, vault: Vault) => {
//           return (
//             <React.Fragment>
//               <OpenNoteActions note={note} notes={notes} vault={vault} />
//               <NoteActions note={note} notes={notes} vault={vault} />
//             </React.Fragment>
//           );
//         }}
//       />
//     );
//     return <Action.Push title={`Show Mentioning Notes (${count})`} target={list} icon={Icon.Megaphone} />;
//   } else {
//     return <React.Fragment></React.Fragment>;
//   }
// }

export function CopyCodeAction(props: { note: NoteWithContent }) {
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

type NoteActionType = "bookmark" | "unbookmark" | "edit" | "append" | "appendSelected";

export function NoteActions(props: {
  note: NoteWithContent;
  vault: ObsidianVault;
  onNoteAction?: (actionType: NoteActionType) => void;
  onNoteUpdated?: (notePath: string, updates: Partial<Note>) => void;
  onDelete?: (note: Note, vault: ObsidianVault) => void;
}) {
  const { note, vault, onNoteAction, onNoteUpdated, onDelete } = props;

  return (
    <>
      <ShowPathInFinderAction path={note.path} />
      {/* <ShowMentioningNotesAction vault={vault} str={note.title} notes={notes} /> */}
      {note.bookmarked ? (
        <UnbookmarkNoteAction note={note} vault={vault} onUnbookmark={() => onNoteAction?.("unbookmark")} />
      ) : (
        <BookmarkNoteAction note={note} vault={vault} onBookmark={() => onNoteAction?.("bookmark")} />
      )}
      <CopyCodeAction note={note} />
      <EditNoteAction note={note} vault={vault} onNoteUpdated={onNoteUpdated} />
      <AppendToNoteAction note={note} vault={vault} onNoteUpdated={onNoteUpdated} />
      <AppendSelectedTextToNoteAction note={note} vault={vault} onNoteUpdated={onNoteUpdated} />
      <CopyNoteAction note={note} />
      <CopyNoteTitleAction note={note} />
      <CopyNotePathAction note={note} />
      <PasteNoteAction note={note} />
      <CopyMarkdownLinkAction note={note} />
      <CopyObsidianURIAction note={note} />
      <DeleteNoteAction note={note} vault={vault} onDelete={onDelete} />
      <AppendTaskAction note={note} vault={vault} onNoteUpdated={onNoteUpdated} />
    </>
  );
}

export function OpenNoteActions(props: { note: NoteWithContent; vault: ObsidianVault; showQuickLook?: boolean }) {
  const { note, vault, showQuickLook = true } = props;
  const { primaryAction } = getPreferenceValues<SearchNotePreferences>();

  const { vaultsWithPlugin } = useVaultPluginCheck({ vaults: [vault], communityPlugins: ["obsidian-advanced-uri"] });

  const quicklook = <QuickLookAction note={note} vault={vault} />;
  const openInDefaultApp = <OpenInDefaultAppAction note={note} vault={vault} />;
  const obsidian = <OpenPathInObsidianAction path={note.path} />;
  const obsidianNewPane = vaultsWithPlugin.includes(vault) ? (
    <OpenNoteInObsidianNewPaneAction note={note} vault={vault} />
  ) : null;

  if (primaryAction == PrimaryAction.QuickLook) {
    return (
      <React.Fragment>
        {showQuickLook && quicklook}
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

export function AppendTaskAction(props: {
  note: Note;
  vault: ObsidianVault;
  onNoteUpdated?: (notePath: string, updates: Partial<Note>) => void;
}) {
  const { note, vault, onNoteUpdated } = props;

  return (
    <Action.Push
      title="Append Task"
      target={<AppendNoteForm note={note} vault={vault} onNoteUpdated={onNoteUpdated} />}
      shortcut={{ modifiers: ["opt"], key: "a" }}
      icon={Icon.Pencil}
    />
  );
}
