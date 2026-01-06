import { Note } from "@/obsidian";
import { getPreferenceValues, getSelectedText, Icon } from "@raycast/api";
import fs from "fs";
import path from "path";
import {
  AUDIO_FILE_EXTENSIONS,
  BYTES_PER_KILOBYTE,
  CODE_BLOCK_REGEX,
  LATEX_INLINE_REGEX,
  LATEX_REGEX,
  VIDEO_FILE_EXTENSIONS,
} from "./constants";
import { Media } from "./interfaces";
import { GlobalPreferences } from "./preferences";

export interface CodeBlock {
  language: string;
  code: string;
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
}

/** Gets the icon for a given file path. This is used to determine the icon for a media item where the media itself can't be displayed (e.g. video, audio). */
export function getIconFor(filePath: string) {
  const fileExtension = path.extname(filePath);
  if (VIDEO_FILE_EXTENSIONS.includes(fileExtension)) {
    return { source: Icon.Video };
  } else if (AUDIO_FILE_EXTENSIONS.includes(fileExtension)) {
    return { source: Icon.Microphone };
  }
  return { source: filePath };
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

export function getCodeBlocks(content: string): CodeBlock[] {
  const codeBlockMatches = content.matchAll(CODE_BLOCK_REGEX);
  const codeBlocks = [];
  for (const codeBlockMatch of codeBlockMatches) {
    const [, language, code] = codeBlockMatch;
    codeBlocks.push({ language, code });
  }
  return codeBlocks;
}
