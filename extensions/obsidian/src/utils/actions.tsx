import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Detail,
  Icon,
  showToast,
  Toast,
  getSelectedText,
} from "@raycast/api";

import fs from "fs";
import React, { useState } from "react";

import { AppendNoteForm } from "../components/AppendNoteForm";
import { SearchNotePreferences, Note } from "./interfaces";
import { isNotePinned, pinNote, unpinNote } from "./PinNoteUtils";

enum PrimaryAction {
  QuickLook = "quicklook",
  OpenInObsidian = "obsidian",
}

async function appendSelectedTextTo(note: Note) {
  const pref: SearchNotePreferences = getPreferenceValues();
  let appendPrefix = pref.appendPrefix;
  if (appendPrefix === undefined) {
    appendPrefix = "";
  }
  try {
    const selectedText = await getSelectedText();
    if (selectedText.trim() == "") {
      showToast({ title: "No text selected", message: "Make sure to select some text.", style: Toast.Style.Failure });
    } else {
      fs.appendFileSync(note.path, "\n" + appendPrefix + selectedText);
      showToast({ title: "Added selected text to note", style: Toast.Style.Success });
    }
  } catch {
    showToast({
      title: "Couldn't copy selected text",
      message: "Maybe you didn't select anything.",
      style: Toast.Style.Failure,
    });
  }
}

function NoteQuickLook(props: { note: Note; vaultPath: string }) {
  const note = props.note;
  return (
    <Detail
      markdown={note.content}
      actions={
        <ActionPanel>
          <Action.Open title="Open in Obsidian" target={"obsidian://open?path=" + encodeURIComponent(note.path)} />
        </ActionPanel>
      }
    />
  );
}

export function NoteActions(props: { note: Note; vaultPath: string; onPin: () => void }) {
  const note = props.note;

  const [pinned, setPinned] = useState(isNotePinned(note, props.vaultPath));

  return (
    <React.Fragment>
      <Action.ShowInFinder
        title="Show in Finder"
        icon={Icon.Finder}
        path={note.path}
        shortcut={{ modifiers: ["opt"], key: "enter" }}
      />

      <Action.Push
        title="Append to Note"
        target={<AppendNoteForm note={note} />}
        shortcut={{ modifiers: ["opt"], key: "a" }}
        icon={Icon.Pencil}
      />

      <Action
        title="Append Selected Text to Note"
        shortcut={{ modifiers: ["opt"], key: "s" }}
        onAction={() => {
          appendSelectedTextTo(note);
        }}
        icon={Icon.Pencil}
      />

      <Action.CopyToClipboard
        title="Copy Note Content"
        content={note.content}
        shortcut={{ modifiers: ["opt"], key: "c" }}
      />

      <Action.Paste title="Paste Note Content" content={note.content} shortcut={{ modifiers: ["opt"], key: "v" }} />

      <Action.CopyToClipboard
        title="Copy Markdown Link"
        icon={Icon.Link}
        content={`[${note.title}](obsidian://open?path=${encodeURIComponent(note.path)})`}
        shortcut={{ modifiers: ["opt"], key: "l" }}
      />

      <Action.CopyToClipboard
        title="Copy Obsidian URI"
        icon={Icon.Link}
        content={`obsidian://open?path=${encodeURIComponent(note.path)}`}
        shortcut={{ modifiers: ["opt"], key: "u" }}
      />

      <Action
        title={pinned ? "Unpin Note" : "Pin Note"}
        shortcut={{ modifiers: ["opt"], key: "p" }}
        onAction={() => {
          if (pinned) {
            unpinNote(note, props.vaultPath);
            setPinned(!pinned);
            props.onPin();
          } else {
            pinNote(note, props.vaultPath);
            setPinned(!pinned);
            props.onPin();
          }
        }}
        icon={pinned ? Icon.XmarkCircle : Icon.Pin}
      />
    </React.Fragment>
  );
}

export function OpenNoteActions(props: { note: Note; vaultPath: string }) {
  const note = props.note;
  const pref: SearchNotePreferences = getPreferenceValues();
  const primaryAction = pref.primaryAction;

  const quicklook = (
    <Action.Push
      title="Quick Look"
      target={<NoteQuickLook note={note} vaultPath={props.vaultPath} />}
      icon={Icon.Eye}
    />
  );

  const obsidian = (
    <Action.Open
      title="Open in Obsidian"
      target={"obsidian://open?path=" + encodeURIComponent(note.path)}
      icon={Icon.TextDocument}
    />
  );

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
