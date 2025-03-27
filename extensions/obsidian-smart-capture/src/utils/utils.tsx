import { Clipboard, getPreferenceValues, getSelectedText, showToast, Toast } from "@raycast/api";

import fs from "fs";
import { readFile } from "fs/promises";
import fetch from "node-fetch";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { parse } from "node-html-parser";
import { homedir } from "os";
import { default as fsPath, default as path } from "path";
import { createContext, useEffect, useMemo, useState } from "react";

// @ts-expect-error url and input are mismatched
global.fetch = fetch;

import { CodeBlock, Media, MediaState, Note, ObsidianJSON, ObsidianVaultsState, Vault } from "../utils/interfaces";

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

export function getUserIgnoreFilters(vault: Vault) {
  const appJSONPath = vault.path + "/.obsidian/app.json";
  if (!fs.existsSync(appJSONPath)) {
    return [];
  } else {
    const appJSON = JSON.parse(fs.readFileSync(appJSONPath, "utf-8"));
    return appJSON["userIgnoreFilters"] || [];
  }
}

export function getBookmarkedJSON(vault: Vault) {
  const bookmarkedNotesPath = vault.path + "/.obsidian/bookmarks.json";
  if (!fs.existsSync(bookmarkedNotesPath)) {
    return [];
  } else {
    return JSON.parse(fs.readFileSync(bookmarkedNotesPath, "utf-8"))["items"] || [];
  }
}

export function writeToBookmarkedJSON(vault: Vault, bookmarkedNotes: Note[]) {
  const bookmarkedNotesPath = vault.path + "/.obsidian/bookmarks.json";
  fs.writeFileSync(bookmarkedNotesPath, JSON.stringify({ items: bookmarkedNotes }));
}

export function getBookmarkedNotePaths(vault: Vault) {
  const bookmarkedNotes = getBookmarkedJSON(vault);
  return bookmarkedNotes.map((note: { type: string; title: string; path: string }) => note.path);
}

export function bookmarkNote(vault: Vault, note: Note) {
  const bookmarkedNotes = getBookmarkedJSON(vault);
  const bookmarkedNote = {
    type: "file",
    title: note.title,
    path: note.path.split(vault.path)[1].slice(1),
  };
  bookmarkedNotes.push(bookmarkedNote);
  writeToBookmarkedJSON(vault, bookmarkedNotes);
}

export function unbookmarkNote(vault: Vault, note: Note) {
  const bookmarkedNotes = getBookmarkedJSON(vault);
  const index = bookmarkedNotes.findIndex(
    (bookmarked: { type: string; title: string; path: string }) =>
      bookmarked.path === note.path.split(vault.path)[1].slice(1)
  );
  bookmarkedNotes.splice(index, 1);
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
    .map((vault) => ({
      name: getVaultNameFromPath(vault.trim()),
      key: vault.trim(),
      path: vault.trim(),
    }));
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

export async function applyTemplates(content: string) {
  const date = new Date();
  const week = await ISO8601_week_no(date);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  const timestamp = Date.now().toString();

  content = content.replaceAll("{time}", date.toLocaleTimeString());
  content = content.replaceAll("{date}", date.toLocaleDateString());

  content = content.replaceAll("{week}", week.toString().padStart(2, "0"));

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
      showToast({
        title: "No text selected",
        message: "Make sure to select some text.",
        style: Toast.Style.Failure,
      });
    } else {
      let content = appendSelectedTemplate.replaceAll("{content}", selectedText);
      content = await applyTemplates(content);
      fs.appendFileSync(note.path, "\n" + content);
      showToast({
        title: "Added selected text to note",
        style: Toast.Style.Success,
      });
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
  DailyNoteAppend = "obsidian://advanced-uri?daily=true&mode=append",
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
      silent?: boolean;
    }
  | {
      type: ObsidianTargetType.NewNote;
      vault: Vault;
      name: string;
      content?: string;
    }
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
    if (file.includes(include)) {
      return false;
    }
  }
  return true;
}

export function walkFilesHelper(dirPath: string, exFolders: string[], fileEndings: string[], arrayOfFiles: string[]) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  for (const file of files) {
    const next = fs.statSync(dirPath + "/" + file);
    if (next.isDirectory() && validFile(file, [".git", ".obsidian", ".trash", ".excalidraw", ".mobile"])) {
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

export async function urlToMarkdown(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Unable to fetch URL");
  }
  const data = await res.text();
  if (!data) {
    throw new Error("Unable to fetch URL contents");
  }

  const document = parse(data);

  // This doesn't catch everything but it's a good start
  const content =
    // Common article selectors
    document.querySelector("article") ||
    document.querySelector("main") ||
    document.querySelector(".post-content") ||
    document.querySelector(".article-body") ||
    document.querySelector(".article-content") ||
    document.querySelector(".entry-content") ||
    document.querySelector(".post") ||
    document.querySelector(".blog-post") ||
    // Content-specific classes
    document.querySelector(".content-area") ||
    document.querySelector(".content-body") ||
    document.querySelector(".main-content") ||
    document.querySelector(".page-content") ||
    document.querySelector(".single-content") ||
    document.querySelector(".markdown") ||
    document.querySelector(".markdown-body") ||
    // Medium-style selectors
    document.querySelector(".story-body") ||
    document.querySelector(".story-content") ||
    // WordPress common selectors
    document.querySelector(".entry") ||
    document.querySelector(".post-entry") ||
    document.querySelector(".wordpress-content") ||
    // Generic content containers
    document.querySelector("#content") ||
    document.querySelector("#main") ||
    document.querySelector("#post") ||
    document.querySelector("#article") ||
    // ARIA roles
    document.querySelector('[role="main"]') ||
    document.querySelector('[role="article"]') ||
    // Common content wrappers
    document.querySelector(".container .content") ||
    document.querySelector(".wrapper .content") ||
    // Blog platforms
    document.querySelector(".ghost-content") ||
    document.querySelector(".substack-content") ||
    // Documentation sites
    document.querySelector(".docs-content") ||
    document.querySelector(".documentation") ||
    // News sites
    document.querySelector(".article__body") ||
    document.querySelector(".article__content") ||
    document.querySelector(".story__content");

  if (!content) {
    throw new Error("Unable to parse article content");
  }

  // Remove unwanted elements
  const elementsToRemove = [
    "nav",
    "header",
    "footer",
    ".navigation",
    ".social-share",
    ".author-bio",
    ".related-posts",
    ".comments",
    "script",
    "style",
  ];

  elementsToRemove.forEach((selector) => {
    const elements = content.querySelectorAll(selector);
    elements?.forEach((element) => element.remove());
  });

  const markdown = NodeHtmlMarkdown.translate(content.toString());

  // Clean up the markdown
  const cleanMarkdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

  return cleanMarkdown;
}

export const NotesContext = createContext([] as Note[]);
// eslint-disable-next-line @typescript-eslint/no-empty-function
export const NotesDispatchContext = createContext((() => {}) as (action: NoteReducerAction) => void);
