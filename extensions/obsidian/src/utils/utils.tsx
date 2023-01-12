import {
  getPreferenceValues,
  Clipboard,
  Icon,
  Toast,
  confirmAlert,
  showToast,
  getSelectedText,
  environment,
} from "@raycast/api";

import fs from "fs";
import fsPath from "path";
import path from "path";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { useEffect, useMemo, useState } from "react";

import {
  Note,
  ObsidianJSON,
  ObsidianVaultsState,
  GlobalPreferences,
  SearchNotePreferences,
  Vault,
  QuickLookPreferences,
  MediaState,
  Media,
  CodeBlock,
} from "../utils/interfaces";

import {
  BYTES_PER_KILOBYTE,
  CODE_BLOCK_REGEX,
  DAY_NUMBER_TO_STRING,
  LATEX_INLINE_REGEX,
  LATEX_REGEX,
  MONTH_NUMBER_TO_STRING,
} from "./constants";
import { isNotePinned, unpinNote } from "./pinNoteUtils";
import { useNotes } from "./cache";
import { MediaLoader } from "./loader";
import { URLSearchParams } from "url";

export function getCodeBlocks(content: string): CodeBlock[] {
  const codeBlockMatches = content.matchAll(CODE_BLOCK_REGEX);
  const codeBlocks = [];
  for (const codeBlockMatch of codeBlockMatches) {
    const [, language, code] = codeBlockMatch;
    codeBlocks.push({ language, code });
  }
  return codeBlocks;
}

export function filterContent(content: string) {
  const pref: QuickLookPreferences = getPreferenceValues();

  if (pref.removeYAML) {
    const yamlHeader = content.match(/---(.|\n)*?---/gm);
    if (yamlHeader) {
      content = content.replace(yamlHeader[0], "");
    }
  }
  if (pref.removeLatex) {
    const latex = content.matchAll(LATEX_REGEX);
    for (const match of latex) {
      content = content.replace(match[0], "");
    }
    const latexInline = content.matchAll(LATEX_INLINE_REGEX);
    for (const match of latexInline) {
      content = content.replace(match[0], "");
    }
  }
  if (pref.removeLinks) {
    content = content.replaceAll("![[", "");
    content = content.replaceAll("[[", "");
    content = content.replaceAll("]]", "");
  }
  return content;
}

export function getNoteFileContent(path: string, filter = true) {
  let content = "";
  content = fs.readFileSync(path, "utf8") as string;
  return filter ? filterContent(content) : content;
}

export function vaultPluginCheck(vaults: Vault[], plugin: string) {
  const vaultsWithoutPlugin: Vault[] = [];
  vaults = vaults.filter((vault: Vault) => {
    const communityPluginsPath = vault.path + "/.obsidian/community-plugins.json";
    if (!fs.existsSync(communityPluginsPath)) {
      vaultsWithoutPlugin.push(vault);
    } else {
      const plugins: string[] = JSON.parse(fs.readFileSync(communityPluginsPath, "utf-8"));

      if (plugins.includes(plugin)) {
        return vault;
      } else {
        vaultsWithoutPlugin.push(vault);
      }
    }
  });
  return [vaults, vaultsWithoutPlugin];
}

function getVaultNameFromPath(vaultPath: string): string {
  const name = vaultPath
    .split(fsPath.sep)
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

export function parseVaults(): Vault[] {
  const pref: GlobalPreferences = getPreferenceValues();
  const vaultString = pref.vaultPath;
  return vaultString
    .split(",")
    .filter((vaultPath) => vaultPath.trim() !== "")
    .map((vault) => ({ name: getVaultNameFromPath(vault.trim()), key: vault.trim(), path: vault.trim() }));
}

async function loadObsidianJson(): Promise<Vault[]> {
  const obsidianJsonPath = fsPath.resolve(`${homedir()}/Library/Application Support/obsidian/obsidian.json`);
  try {
    const obsidianJson = JSON.parse(await readFile(obsidianJsonPath, "utf8")) as ObsidianJSON;
    return Object.values(obsidianJson.vaults).map(({ path }) => ({
      name: getVaultNameFromPath(path),
      key: path,
      path,
    }));
  } catch (e) {
    return [];
  }
}

export function useObsidianVaults(): ObsidianVaultsState {
  const pref = useMemo(() => getPreferenceValues(), []);
  const [state, setState] = useState<ObsidianVaultsState>(
    pref.vaultPath
      ? {
          ready: true,
          vaults: parseVaults(),
        }
      : { ready: false, vaults: [] }
  );

  useEffect(() => {
    if (!state.ready) {
      loadObsidianJson()
        .then((vaults) => {
          setState({ vaults, ready: true });
        })
        .catch(() => setState({ vaults: parseVaults(), ready: true }));
    }
  }, []);

  return state;
}

export async function deleteNote(note: Note, vault: Vault) {
  const options = {
    title: "Delete Note",
    message: 'Are you sure you want to delete the note: "' + note.title + '"?',
    icon: Icon.ExclamationMark,
  };
  if (await confirmAlert(options)) {
    try {
      fs.unlinkSync(note.path);
      if (isNotePinned(note, vault)) {
        unpinNote(note, vault);
      }
      showToast({ title: "Deleted Note", style: Toast.Style.Success });
      return true;
    } catch (error) {
      return false;
    }
  } else {
    return false;
  }
}

export function sortByAlphabet(a: string, b: string) {
  const aTitle = a;
  const bTitle = b;
  if (aTitle > bTitle) {
    return 1;
  } else if (aTitle < bTitle) {
    return -1;
  } else {
    return 0;
  }
}

export function sortNoteByAlphabet(a: Note, b: Note) {
  return sortByAlphabet(a.title, b.title);
}

export function wordCount(str: string) {
  return str.split(" ").length;
}

export function readingTime(str: string) {
  return Math.ceil(wordCount(str) / 200);
}

export function createdDateFor(note: Note) {
  const { birthtime } = fs.statSync(note.path);
  return birthtime;
}

export function fileSizeFor(note: Note) {
  const { size } = fs.statSync(note.path);
  return size / BYTES_PER_KILOBYTE;
}

export function trimPath(path: string, maxLength: number) {
  if (path.length > maxLength) {
    return "..." + path.slice(path.length - maxLength).slice(1);
  } else {
    return path.slice(1);
  }
}

export async function getClipboardContent() {
  const clipboardText = await Clipboard.readText();
  return clipboardText ? clipboardText : "";
}

export async function applyTemplates(content: string) {
  const date = new Date();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  const timestamp = Date.now().toString();

  content = content.replaceAll("{time}", date.toLocaleTimeString());
  content = content.replaceAll("{date}", date.toLocaleDateString());

  content = content.replaceAll("{year}", date.getFullYear().toString());
  content = content.replaceAll("{month}", MONTH_NUMBER_TO_STRING[date.getMonth()]);
  content = content.replaceAll("{day}", DAY_NUMBER_TO_STRING[date.getDay()]);

  content = content.replaceAll("{hour}", hours);
  content = content.replaceAll("{minute}", minutes);
  content = content.replaceAll("{second}", seconds);
  content = content.replaceAll("{millisecond}", date.getMilliseconds().toString());

  content = content.replaceAll("{timestamp}", timestamp);
  content = content.replaceAll("{zettelkastenID}", timestamp);

  const clipboard = await getClipboardContent();
  content = content.replaceAll("{clipboard}", clipboard);
  content = content.replaceAll("{clip}", clipboard);

  content = content.replaceAll("{\n}", "\n");
  content = content.replaceAll("{newline}", "\n");
  content = content.replaceAll("{nl}", "\n");

  return content;
}

export async function appendSelectedTextTo(note: Note) {
  let { appendSelectedTemplate } = getPreferenceValues<SearchNotePreferences>();

  appendSelectedTemplate = appendSelectedTemplate ? appendSelectedTemplate : "{content}";

  try {
    const selectedText = await getSelectedText();
    if (selectedText.trim() == "") {
      showToast({ title: "No text selected", message: "Make sure to select some text.", style: Toast.Style.Failure });
    } else {
      let content = appendSelectedTemplate.replaceAll("{content}", selectedText);
      content = await applyTemplates(content);
      fs.appendFileSync(note.path, "\n" + content);
      showToast({ title: "Added selected text to note", style: Toast.Style.Success });
      return true;
    }
  } catch {
    showToast({
      title: "Couldn't copy selected text",
      message: "Maybe you didn't select anything.",
      style: Toast.Style.Failure,
    });
  }
}

export const getOpenVaultTarget = (vault: Vault) => {
  return "obsidian://open?vault=" + encodeURIComponent(vault.name);
};

export const getOpenPathInObsidianTarget = (path: string) => {
  return "obsidian://open?path=" + encodeURIComponent(path);
};

export const getDailyNoteTarget = (vault: Vault) => {
  return "obsidian://advanced-uri?vault=" + encodeURIComponent(vault.name) + "&daily=true";
};

export const getDailyNoteAppendTarget = (vault: Vault, text: string, heading: string | undefined) => {
  const headingParam = heading ? "&heading=" + encodeURIComponent(heading) : "";
  return (
    "obsidian://advanced-uri?daily=true&mode=append" +
    "&data=" +
    encodeURIComponent(text) +
    "&vault=" +
    encodeURIComponent(vault.name) +
    headingParam
  );
};

export function getListOfExtensions(media: Media[]) {
  const foundExtensions: string[] = [];
  for (const mediaItem of media) {
    const extension = path.extname(mediaItem.path);
    if (!foundExtensions.includes(extension) && extension != "") {
      foundExtensions.push(extension);
    }
  }
  return foundExtensions;
}

function setExtensionVersion(version: string) {
  fs.writeFileSync(environment.supportPath + "/version.txt", version);
}

export function getCurrentPinnedVersion() {
  if (!fs.existsSync(environment.supportPath + "/version.txt")) {
    setExtensionVersion("");
    return undefined;
  } else {
    const version = fs.readFileSync(environment.supportPath + "/version.txt", "utf8");
    return version;
  }
}

export function isNote(note: Note | undefined): note is Note {
  return (note as Note) !== undefined;
}

export function getRandomNote(vault: Vault | Vault[]) {
  let notes: Note[] = [];
  if (Array.isArray(vault)) {
    for (const v of vault) {
      notes = [...notes, ...useNotes(v)];
    }
  } else {
    notes = useNotes(vault);
  }

  const randomNote = notes[Math.floor(Math.random() * notes.length)];
  return randomNote;
}

export function walkFilesHelper(dirPath: string, exFolders: string[], fileEndings: string[], arrayOfFiles: string[]) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  for (const file of files) {
    const next = fs.statSync(dirPath + "/" + file);
    if (next.isDirectory() && !file.includes(".obsidian")) {
      arrayOfFiles = walkFilesHelper(dirPath + "/" + file, exFolders, fileEndings, arrayOfFiles);
    } else {
      if (
        validFileEnding(file, fileEndings) &&
        file !== ".md" &&
        !file.includes(".excalidraw") &&
        !dirPath.includes(".obsidian") &&
        validFolder(dirPath, exFolders)
      ) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  }

  return arrayOfFiles;
}

export function validFolder(folder: string, exFolders: string[]) {
  for (const f of exFolders) {
    if (folder.includes(f)) {
      return false;
    }
  }
  return true;
}

export function validFileEnding(file: string, fileEndings: string[]) {
  for (const ending of fileEndings) {
    if (file.endsWith(ending)) {
      return true;
    }
  }
  return false;
}

export function prefExcludedFolders() {
  const pref: SearchNotePreferences = getPreferenceValues();
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

export function useMedia(vault: Vault) {
  const [media, setMedia] = useState<MediaState>({
    ready: false,
    media: [],
  });

  useEffect(() => {
    async function fetch() {
      if (!media.ready) {
        try {
          await fs.promises.access(vault.path + "/.");

          const ml = new MediaLoader(vault);
          const media = ml.loadMedia().sort((m1, m2) => sortByAlphabet(m1.title, m2.title));

          setMedia({ ready: true, media });
        } catch (error) {
          showToast({
            title: "The path set in preferences doesn't exist",
            message: "Please set a valid path in preferences",
            style: Toast.Style.Failure,
          });
        }
      }
    }
    fetch();
  }, []);

  return media;
}
