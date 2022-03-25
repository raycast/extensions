import {
  ActionPanel,
  OpenAction,
  getPreferenceValues,
  CopyToClipboardAction,
  PasteAction,
  PushAction,
  Detail,
  Icon,
  showToast,
  ToastStyle,
  getSelectedText,
} from "@raycast/api";

//@ts-ignore
import { Action } from "@raycast/api";

import fs from "fs";
import React from "react";

import { AppendNoteForm } from "./components/AppendNoteForm";
import { SearchNotePreferences, Note } from "./interfaces";

enum PrimaryAction {
  QuickLook = "quicklook",
  OpenInObsidian = "obsidian",
}

function getNoteContent(note: Note) {
  const pref: SearchNotePreferences = getPreferenceValues();

  let content = fs.readFileSync(note.path, "utf8") as string;
  if (pref.removeYAML) {
    const yamlHeader = content.match(/---(.|\n)*?---/gm);
    if (yamlHeader) {
      content = content.replace(yamlHeader[0], "");
    }
  }
  if (pref.removeLinks) {
    content = content.replaceAll("[[", "");
    content = content.replaceAll("]]", "");
  }
  return content;
}

async function appendSelectedTextTo(note: Note) {
  let selectedText = "";
  try {
    selectedText = await getSelectedText();
    console.log(selectedText);
    if (selectedText.trim() == "") {
      showToast(ToastStyle.Failure, "No text selected");
    } else {
      fs.appendFileSync(note.path, "\n\n" + selectedText);
      showToast(ToastStyle.Success, "Added selected text to note");
    }
  } catch {
    showToast(ToastStyle.Failure, "Couldn't copy selected text");
  }
}

function NoteQuickLook(props: { note: Note }) {
  const note = props.note;
  const content = getNoteContent(note);
  return (
    <Detail
      markdown={content}
      actions={
        <ActionPanel>
          <OpenAction title="Open in Obsidian" target={"obsidian://open?path=" + encodeURIComponent(note.path)} />
          <NoteActions note={note} />
        </ActionPanel>
      }
    />
  );
}

export function NoteActions(props: { note: Note }) {
  const note = props.note;
  return (
    <React.Fragment>
      <PushAction
        title="Append to note"
        target={<AppendNoteForm note={note} />}
        shortcut={{ modifiers: ["opt"], key: "a" }}
        icon={Icon.Pencil}
      />

      <Action
        title="Append selected text"
        shortcut={{ modifiers: ["opt"], key: "s" }}
        onAction={() => {
          appendSelectedTextTo(note);
        }}
        icon={Icon.Pencil}
      />

      <CopyToClipboardAction
        title="Copy note content"
        content={getNoteContent(note)}
        shortcut={{ modifiers: ["opt"], key: "c" }}
      />

      <PasteAction
        title="Paste note content"
        content={getNoteContent(note)}
        shortcut={{ modifiers: ["opt"], key: "v" }}
      />

      <CopyToClipboardAction
        title="Copy markdown link"
        icon={Icon.Link}
        content={`[${note.title}](obsidian://open?path=${encodeURIComponent(note.path)})`}
        shortcut={{ modifiers: ["opt"], key: "l" }}
      />

      <CopyToClipboardAction
        title="Copy obsidian URI"
        icon={Icon.Link}
        content={`obsidian://open?path=${encodeURIComponent(note.path)}`}
        shortcut={{ modifiers: ["opt"], key: "u" }}
      />
    </React.Fragment>
  );
}

export function OpenNoteActions(props: { note: Note }) {
  const note = props.note;
  const pref: SearchNotePreferences = getPreferenceValues();
  const primaryAction = pref.primaryAction;

  const quicklook = <PushAction title="Quick Look" target={<NoteQuickLook note={note} />} icon={Icon.Eye} />;

  const obsidian = (
    <OpenAction title="Open in Obsidian" target={"obsidian://open?path=" + encodeURIComponent(note.path)} />
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
