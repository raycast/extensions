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
  const pref: SearchNotePreferences = getPreferenceValues();
  const appendPrefix = pref.appendPrefix;
  try {
    const selectedText = getSelectedText();
    selectedText.then((text) => {
      if (text.trim() == "") {
        showToast({ title: "No text selected", message: "Make sure to select some text.", style: Toast.Style.Failure });
      } else {
        fs.appendFileSync(note.path, "\n" + appendPrefix + text);
        showToast({ title: "Added selected text to note", style: Toast.Style.Success });
      }
    });
  } catch {
    showToast({ title: "Couldn't copy selected text", style: Toast.Style.Failure });
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
          <Action.Open title="Open in Obsidian" target={"obsidian://open?path=" + encodeURIComponent(note.path)} />
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
        content={getNoteContent(note)}
        shortcut={{ modifiers: ["opt"], key: "c" }}
      />

      <Action.Paste
        title="Paste Note Content"
        content={getNoteContent(note)}
        shortcut={{ modifiers: ["opt"], key: "v" }}
      />

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
    </React.Fragment>
  );
}

export function OpenNoteActions(props: { note: Note }) {
  const note = props.note;
  const pref: SearchNotePreferences = getPreferenceValues();
  const primaryAction = pref.primaryAction;

  const quicklook = <Action.Push title="Quick Look" target={<NoteQuickLook note={note} />} icon={Icon.Eye} />;

  const obsidian = (
    <Action.Open title="Open in Obsidian" target={"obsidian://open?path=" + encodeURIComponent(note.path)} />
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
