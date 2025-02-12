import { getPreferenceValues, Clipboard, Toast, showToast, getSelectedText } from "@raycast/api";

import fs from "fs";
import fsPath from "path";
import path from "path";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { createContext, useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";

import { Note, ObsidianJSON, ObsidianVaultsState, Vault, MediaState, Media, CodeBlock } from "../utils/interfaces";

import {
  BYTES_PER_KILOBYTE,
  CODE_BLOCK_REGEX,
  DAY_NUMBER_TO_STRING,
  LATEX_INLINE_REGEX,
  LATEX_REGEX,
  MONTH_NUMBER_TO_STRING,
} from "./constants";

import { MediaLoader } from "./data/loader";

import { NoteReducerAction } from "./data/reducers";
import { GlobalPreferences, SearchNotePreferences } from "./preferences";

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
  const pref: GlobalPreferences = getPreferenceValues();

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

export function getNoteFileContent(path: string, filter = false) {
  let content = "";
  content = fs.readFileSync(path, "utf8") as string;
  return filter ? filterContent(content) : content;
}

export function vaultPluginCheck(vaults: Vault[], plugin: string) {
  const vaultsWithoutPlugin: Vault[] = [];
  const { configFileName } = getPreferenceValues();
  vaults = vaults.filter((vault: Vault) => {
    const communityPluginsPath = `${vault.path}/${configFileName || ".obsidian"}/community-plugins.json`;
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

export function getUserIgnoreFilters(vault: Vault) {
  const { configFileName } = getPreferenceValues();
  const appJSONPath = `${vault.path}/${configFileName || ".obsidian"}/app.json`;
  if (!fs.existsSync(appJSONPath)) {
    return [];
  } else {
    const appJSON = JSON.parse(fs.readFileSync(appJSONPath, "utf-8"));
    return appJSON["userIgnoreFilters"] || [];
  }
}

type BookmarkFile = { type: "file"; path: string; title: string };
type BookMarkGroup = { type: "group"; title: string; items: BookmarkEntry[] };
type BookmarkEntry = BookmarkFile | BookMarkGroup;
function* flattenBookmarks(BookmarkEntry: BookmarkEntry[]): Generator<BookmarkEntry> {
  for (const item of BookmarkEntry) {
    if (item.type === "file") yield item;
    if (item.type === "group" && item.items) yield* flattenBookmarks(item.items);
  }
}

function getBookmarkedJSON(vault: Vault): BookmarkEntry[] {
  const { configFileName } = getPreferenceValues();
  const bookmarkedNotesPath = `${vault.path}/${configFileName || ".obsidian"}/bookmarks.json`;
  if (!fs.existsSync(bookmarkedNotesPath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(bookmarkedNotesPath, "utf-8"))?.items || [];
}

function getBookmarkedList(vault: Vault): BookmarkEntry[] {
  return Array.from(flattenBookmarks(getBookmarkedJSON(vault)));
}

function writeToBookmarkedJSON(vault: Vault, bookmarkedNotes: BookmarkEntry[]) {
  const { configFileName } = getPreferenceValues();
  const bookmarkedNotesPath = `${vault.path}/${configFileName || ".obsidian"}/bookmarks.json`;
  fs.writeFileSync(bookmarkedNotesPath, JSON.stringify({ items: bookmarkedNotes }));
}

export function getBookmarkedNotePaths(vault: Vault) {
  const bookmarkedNotes = getBookmarkedList(vault);
  return (bookmarkedNotes.filter((note) => note.type === "file") as BookmarkFile[]).map((note) => note.path);
}

export function bookmarkNote(vault: Vault, note: Note) {
  const bookmarkedNotes = getBookmarkedJSON(vault);
  const bookmarkedNote: BookmarkFile = {
    type: "file",
    title: note.title,
    path: note.path.split(vault.path)[1].slice(1),
  };
  bookmarkedNotes.push(bookmarkedNote);
  writeToBookmarkedJSON(vault, bookmarkedNotes);
}

export function unbookmarkNote(vault: Vault, note: Note) {
  const bookmarkedNotes = getBookmarkedJSON(vault);
  const notePath = note.path.split(vault.path)[1].slice(1);

  const removeBookmark = (items: BookmarkEntry[]) => {
    const index = items.findIndex((item) => item.type === "file" && item.path === notePath);
    if (index !== -1) {
      items.splice(index, 1);
    } else {
      for (const item of items) {
        if (item.type === "group" && item.items) {
          removeBookmark(item.items);
        }
      }
    }
  };
  removeBookmark(bookmarkedNotes);
  writeToBookmarkedJSON(vault, bookmarkedNotes);
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
    .filter((vaultPath) => fs.existsSync(vaultPath))
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

export function deleteNote(note: Note) {
  fs.unlinkSync(note.path);
  showToast({ title: "Deleted Note", style: Toast.Style.Success });
  return true;
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

async function ISO8601_week_no(dt: Date) {
  const tdt = new Date(dt.getTime());
  const dayn = (dt.getDay() + 6) % 7;
  tdt.setDate(tdt.getDate() - dayn + 3);
  const firstThursday = tdt.getTime();
  tdt.setMonth(0, 1);
  if (tdt.getDay() !== 4) {
    tdt.setMonth(0, 1 + ((4 - tdt.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - tdt.getTime()) / 604800000);
}

/** both content and template might have templates to apply */
export async function applyTemplates(content: string, template = "") {
  const date = new Date();
  const dateTime = DateTime.now();
  const week = await ISO8601_week_no(date);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const timestamp = Date.now().toString();
  const clipboard = await getClipboardContent();

  const preprocessed = template.includes("{content}")
    ? template // Has {content} e.g. | {hour}:{minute} | {content} |
    : template + content; // Does not have {content}, then add it to the end

  return preprocessed
    .replaceAll("{content}", content) // Replace {content} with content first so that is can be broken out
    .replaceAll(/{.*?}/g, (match) => {
      const key = match.slice(1, -1);
      switch (key) {
        case "S":
        case "u":
        case "SSS":
        case "s":
        case "ss":
        case "uu":
        case "uuu":
        case "m":
        case "mm":
        case "h":
        case "hh":
        case "H":
        case "HH":
        case "Z":
        case "ZZ":
        case "ZZZ":
        case "ZZZZ":
        case "ZZZZZ":
        case "z":
        case "a":
        case "d":
        case "dd":
        case "c":
        case "ccc":
        case "cccc":
        case "ccccc":
        case "E":
        case "EEE":
        case "EEEE":
        case "EEEEE":
        case "L":
        case "LL":
        case "LLL":
        case "LLLL":
        case "LLLLL":
        case "M":
        case "MM":
        case "MMM":
        case "MMMM":
        case "MMMMM":
        case "y":
        case "yy":
        case "yyyy":
        case "yyyyyy":
        case "G":
        case "GG":
        case "GGGGG":
        case "kk":
        case "kkkk":
        case "W":
        case "WW":
        case "n":
        case "nn":
        case "ii":
        case "iiii":
        case "o":
        case "ooo":
        case "q":
        case "qq":
        case "X":
        case "x":
          return dateTime.toFormat(key);
        case "content":
          return content;
        case "time":
          return date.toLocaleTimeString();
        case "date":
          return date.toLocaleDateString();
        case "week":
          return week.toString().padStart(2, "0");
        case "year":
          return date.getFullYear().toString();
        case "month":
          return MONTH_NUMBER_TO_STRING[date.getMonth()];
        case "day":
          return DAY_NUMBER_TO_STRING[date.getDay()];
        case "hour":
          return hours;
        case "minute":
          return minutes;
        case "second":
          return seconds;
        case "millisecond":
          return date.getMilliseconds().toString();
        case "timestamp":
          return timestamp;
        case "zettelkastenID":
          return timestamp;
        case "clipboard":
          return clipboard;
        case "clip":
          return clipboard;
        case "\n":
          return "\n";
        case "newline":
          return "\n";
        case "nl":
          return "\n";
        default:
          return match;
      }
    });
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

export enum ObsidianTargetType {
  OpenVault = "obsidian://open?vault=",
  OpenPath = "obsidian://open?path=",
  DailyNote = "obsidian://advanced-uri?daily=true&vault=",
  DailyNoteAppend = "obsidian://advanced-uri?daily=true",
  NewNote = "obsidian://new?vault=",
  AppendTask = "obsidian://advanced-uri?mode=append&filepath=",
}

export type ObsidianTarget =
  | { type: ObsidianTargetType.OpenVault; vault: Vault }
  | { type: ObsidianTargetType.OpenPath; path: string }
  | { type: ObsidianTargetType.DailyNote; vault: Vault }
  | {
      type: ObsidianTargetType.DailyNoteAppend;
      vault: Vault;
      text: string;
      heading?: string;
      prepend?: boolean;
      silent?: boolean;
    }
  | { type: ObsidianTargetType.NewNote; vault: Vault; name: string; content?: string }
  | {
      type: ObsidianTargetType.AppendTask;
      vault: Vault;
      text: string;
      path: string;
      heading?: string;
      silent?: boolean;
    };

export function getObsidianTarget(target: ObsidianTarget) {
  switch (target.type) {
    case ObsidianTargetType.OpenVault: {
      return ObsidianTargetType.OpenVault + encodeURIComponent(target.vault.name);
    }
    case ObsidianTargetType.OpenPath: {
      return ObsidianTargetType.OpenPath + encodeURIComponent(target.path);
    }
    case ObsidianTargetType.DailyNote: {
      return ObsidianTargetType.DailyNote + encodeURIComponent(target.vault.name);
    }
    case ObsidianTargetType.DailyNoteAppend: {
      const headingParam = target.heading ? "&heading=" + encodeURIComponent(target.heading) : "";
      return (
        ObsidianTargetType.DailyNoteAppend +
        (target.prepend ? "&mode=prepend" : "&mode=append") +
        "&data=" +
        encodeURIComponent(target.text) +
        "&vault=" +
        encodeURIComponent(target.vault.name) +
        headingParam +
        (target.silent ? "&openmode=silent" : "")
      );
    }
    case ObsidianTargetType.NewNote: {
      return (
        ObsidianTargetType.NewNote +
        encodeURIComponent(target.vault.name) +
        "&name=" +
        encodeURIComponent(target.name) +
        "&content=" +
        encodeURIComponent(target.content || "")
      );
    }
    case ObsidianTargetType.AppendTask: {
      const headingParam = target.heading ? "&heading=" + encodeURIComponent(target.heading) : "";
      return (
        ObsidianTargetType.AppendTask +
        encodeURIComponent(target.path) +
        "&data=" +
        encodeURIComponent(target.text) +
        "&vault=" +
        encodeURIComponent(target.vault.name) +
        headingParam +
        (target.silent ? "&openmode=silent" : "")
      );
    }
    default: {
      return "";
    }
  }
}

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

export function isNote(note: Note | undefined): note is Note {
  return (note as Note) !== undefined;
}

function validFile(file: string, includes: string[]) {
  for (const include of includes) {
    if (include && file.includes(include)) {
      return false;
    }
  }
  return true;
}

export function walkFilesHelper(dirPath: string, exFolders: string[], fileEndings: string[], arrayOfFiles: string[]) {
  const files = fs.readdirSync(dirPath);
  const { configFileName } = getPreferenceValues();

  arrayOfFiles = arrayOfFiles || [];

  for (const file of files) {
    const next = fs.statSync(dirPath + "/" + file);
    if (
      next.isDirectory() &&
      validFile(file, [".git", ".obsidian", ".trash", ".excalidraw", ".mobile", configFileName].filter(Boolean))
    ) {
      arrayOfFiles = walkFilesHelper(dirPath + "/" + file, exFolders, fileEndings, arrayOfFiles);
    } else {
      if (
        validFileEnding(file, fileEndings) &&
        file !== ".md" &&
        !file.includes(".excalidraw") &&
        !dirPath.includes(".obsidian") &&
        !dirPath.includes(configFileName || ".obsidian") &&
        validFolder(dirPath, exFolders)
      ) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  }

  return arrayOfFiles;
}

export function validFolder(folder: string, exFolders: string[]) {
  for (let f of exFolders) {
    if (f.endsWith("/")) {
      f = f.slice(0, -1);
    }
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

export const NotesContext = createContext([] as Note[]);
// eslint-disable-next-line @typescript-eslint/no-empty-function
export const NotesDispatchContext = createContext((() => {}) as (action: NoteReducerAction) => void);
