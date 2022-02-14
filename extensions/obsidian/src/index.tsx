import {
  List,
  ActionPanel,
  OpenAction,
  getPreferenceValues,
  CopyToClipboardAction,
  PasteAction,
  PushAction,
  Detail,
  Form,
  SubmitFormAction,
  useNavigation,
  Icon,
  showToast,
  ToastStyle,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import fs from "fs";
import path from "path";

interface Note {
  title: string;
  key: number;
  path: string;
}

interface Vault {
  name: string;
  key: string;
  path: string;
}

interface Preferences {
  vaultPath: string;
  excludedFolders: string;
  removeYAML: boolean;
  removeLinks: boolean;
  primaryAction: string;
}

enum PrimaryAction {
  QuickLook = "quicklook",
  OpenInObsidian = "obsidian",
}

interface FormValue {
  content: string;
}

function isValidFile(file: string, exFolders: Array<string>) {
  for (const folder of exFolders) {
    if (file.includes(folder)) {
      return false;
    }
  }
  return true;
}

const getFilesHelp = function (dirPath: string, exFolders: Array<string>, arrayOfFiles: Array<string>) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function (file: string) {
    const next = fs.statSync(dirPath + "/" + file);
    if (next.isDirectory() && !file.includes(".obsidian")) {
      arrayOfFiles = getFilesHelp(dirPath + "/" + file, exFolders, arrayOfFiles);
    } else {
      if (file.endsWith(".md") && file !== ".md" && !dirPath.includes(".obsidian") && isValidFile(dirPath, exFolders)) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });
  return arrayOfFiles;
};

function getFiles(vaultPath: string) {
  const exFolders = prefExcludedFolders();
  const files = getFilesHelp(vaultPath.toString(), exFolders, []);
  return files;
}

function getVaultNameFromPath(vaultPath: string): string {
  const name = vaultPath
    .split(path.sep)
    .filter((i) => {
      if (i != "") {
        return i;
      }
    })
    .pop();
  if (name) {
    return name;
  } else {
    return "Default Vault Name (check your path preferences)";
  }
}

function parseVaults() {
  const pref: Preferences = getPreferenceValues();
  const vaultString = pref.vaultPath;
  return vaultString
    .split(",")
    .map((vault) => ({ name: getVaultNameFromPath(vault.trim()), key: vault.trim(), path: vault.trim() }))
    .filter((vault) => !!vault);
}

function prefExcludedFolders() {
  const pref: Preferences = getPreferenceValues();
  const foldersString = pref.excludedFolders;
  if (foldersString) {
    const folders = foldersString.split(",");
    for (let i = 0; i < folders.length; i++) {
      folders[i] = folders[i].trim();
    }
    return folders;
  } else {
    return [];
  }
}

function loadNotes(files: Array<string>) {
  const notes: Note[] = [];

  let key = 0;
  for (const f of files) {
    const comp = f.split("/");
    const f_name = comp.pop();
    let name = "default";
    if (f_name) {
      name = f_name.split(".md")[0];
    }
    const note = {
      title: name,
      key: ++key,
      path: f,
    };
    notes.push(note);
  }
  return notes;
}

// Trying to make content of notes searchable (bad performance)
//function keywordsForNote(note: Note){
// let words = note.content.split(" ")
// let keywords:Array<string> = [];
// for(let i = 0; i < words.length; i++){
//   let word = words[i];
//   if (!keywords.includes(word)){
//     keywords.push(word)
//   }
// }
// console.log(keywords.length)
// if (keywords.length < 570){
// return keywords
// }else{
//   return []
// }
// let x = []
// for(let i = 0; i < 400; i++){
//   x.push("SHORT")
// }
// return x
//}

function getNoteContent(note: Note) {
  const pref: Preferences = getPreferenceValues();

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

function NoteActions(props: { note: Note }) {
  const note = props.note;
  return (
    <React.Fragment>
      <PushAction
        title="Append to note"
        target={<NoteForm note={note} />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
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
        content={`[${note.title}](obsidian://open?path=${encodeURIComponent(note.path)})`}
        shortcut={{ modifiers: ["opt"], key: "l" }}
      />

      <CopyToClipboardAction
        title="Copy obsidian URI"
        content={`obsidian://open?path=${encodeURIComponent(note.path)}`}
        shortcut={{ modifiers: ["opt"], key: "u" }}
      />
    </React.Fragment>
  );
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

function NoteForm(props: { note: Note }) {
  const note = props.note;
  const { pop } = useNavigation();

  function addTextToNote(text: FormValue) {
    fs.appendFileSync(note.path, "\n\n" + text.content);
    showToast(ToastStyle.Success, "Added text to note");
    pop();
  }

  return (
    <Form
      navigationTitle={"Add text to: " + note.title}
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit" onSubmit={addTextToNote} />
        </ActionPanel>
      }
    >
      <Form.TextArea title={"Add text to:\n" + note.title} id="content" placeholder={"Text"} />
    </Form>
  );
}

function OpenNoteActions(props: { note: Note }) {
  const note = props.note;
  const pref: Preferences = getPreferenceValues();
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

function NoteList(props: { vaultPath: string }) {
  const vaultPath = props.vaultPath;
  const [notes, setNotes] = useState<Note[]>();
  useEffect(() => {
    async function fetch() {
      try {
        await fs.promises.access(vaultPath + "/.");
        const files = getFiles(vaultPath);
        const _notes = loadNotes(files);
        setNotes(_notes);
      } catch (error) {
        showToast(ToastStyle.Failure, "The path set in preferences does not exist.");
      }
    }
    fetch();
  }, []);

  return (
    <List isLoading={notes === undefined}>
      {notes?.map((note) => (
        <List.Item
          title={note.title}
          key={note.key}
          actions={
            <ActionPanel>
              <OpenNoteActions note={note} />
              <NoteActions note={note} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function VaultSelection(props: { vaults: Vault[] }) {
  const vaults = props.vaults;
  return (
    <List>
      {vaults?.map((vault) => (
        <List.Item
          title={vault.name}
          key={vault.key}
          actions={
            <ActionPanel>
              <PushAction title="Select Vault" target={<NoteList vaultPath={vault.path} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  const vaults = parseVaults();
  if (vaults.length > 1) {
    return <VaultSelection vaults={vaults} />;
  } else if (vaults.length == 1) {
    return <NoteList vaultPath={vaults[0].path} />;
  } else {
    showToast(ToastStyle.Failure, "Path Error", "Something went wrong with your vault path.");
  }
}
