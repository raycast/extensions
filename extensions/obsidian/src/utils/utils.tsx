import fs from "fs";
import path from "path";
import { BYTES_PER_KILOBYTE } from "./constants";
import { Media } from "./interfaces";
import { Vault } from "../api/vault/vault.types";
import { Note } from "../api/vault/notes/notes.types";
import { getSelectedText } from "@raycast/api";

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

export function trimPathToMaxLength(path: string, maxLength: number) {
  if (path.length > maxLength) {
    return "..." + path.slice(path.length - maxLength).slice(1);
  } else {
    return path.slice(1);
  }
}

export async function ISO8601_week_no(dt: Date) {
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

export function getListOfMediaFileExtensions(media: Media[]) {
  const foundExtensions: string[] = [];
  for (const mediaItem of media) {
    const extension = path.extname(mediaItem.path);
    if (!foundExtensions.includes(extension) && extension != "") {
      foundExtensions.push(extension);
    }
  }
  return foundExtensions;
}

/** Retrieves the currently selected text if available, returns undefined if not found */
export async function getSelectedTextContent(): Promise<string | undefined> {
  let selection;
  try {
    selection = await getSelectedText();
  } catch (error) {
    console.warn("Could not get selected text", error);
  }
  return selection;
} // OBSIDIAN TARGETS

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
