//--------------------------------------------------------------------------------
// All important constants for all commands should be defined here.
//--------------------------------------------------------------------------------

import { Image } from "@raycast/api";

export const MAX_RENDERED_NOTES = 1000;
export const BYTES_PER_KILOBYTE = 1024;
export const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE ** 2;
export const BYTES_PER_GIGABYTE = BYTES_PER_MEGABYTE ** 2;

export enum NoteAction {
  Edit,
  Delete,
  Append,
  Bookmark,
  UnBookmark,
}

export enum PrimaryAction {
  QuickLook = "quicklook",
  OpenInObsidian = "obsidian",
  OpenInObsidianNewPane = "newpane",
}

export const APPLICATION_UUID = "49acc9ee-69a0-4419-9aad-5c2689ff0119";

export const INLINE_TAGS_REGEX = /(#[a-zA-Z_0-9/-]+)/g;
export const YAML_FRONTMATTER_REGEX = /---\s([\s\S]*)---/g;
export const LATEX_REGEX = /\$\$(.|\n)*?\$\$/gm;
export const LATEX_INLINE_REGEX = /\$(.|\n)*?\$/gm;
export const CODE_BLOCK_REGEX = /```(.*)\n([\s\S]*?)```/gm;

export const DAY_NUMBER_TO_STRING: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export const MONTH_NUMBER_TO_STRING: Record<number, string> = {
  0: "Jan",
  1: "Feb",
  2: "Mar",
  3: "Apr",
  4: "May",
  5: "Jun",
  6: "Jul",
  7: "Aug",
  8: "Sep",
  9: "Oct",
  10: "Nov",
  11: "Dec",
};

export const VIDEO_FILE_EXTENSIONS = [
  ".webm",
  ".mkv",
  ".flv",
  ".vob",
  ".ogv",
  ".ogg",
  ".rrc",
  ".gifv",
  ".mng",
  ".mov",
  ".avi",
  ".qt",
  ".wmv",
  ".yuv",
  ".rm",
  ".asf",
  ".amv",
  ".mp4",
  ".m4p",
  ".m4v",
  ".mpg",
  ".mp2",
  ".mpeg",
  ".mpe",
  ".mpv",
  ".m4v",
  ".svi",
  ".3gp",
  ".3g2",
  ".mxf",
  ".roq",
  ".nsv",
  ".flv",
  ".f4v",
  ".f4p",
  ".f4a",
  ".f4b",
  ".mod",
];

export const AUDIO_FILE_EXTENSIONS = [
  "aac",
  "aiff",
  "ape",
  "au",
  "flac",
  "gsm",
  "it",
  "m3u",
  "m4a",
  "mid",
  "mod",
  "mp3",
  "mpa",
  "pls",
  "ra",
  "s3m",
  "sid",
  "wav",
  "wma",
  "xm",
];

export const IMAGE_SIZE_MAPPING: Map<string, number> = new Map([
  ["small", 8],
  ["large", 3],
  ["medium", 5],
]);

export const ObsidianIcon: Image = {
  source: "obsidian_icon.svg",
  tintColor: { dark: "#E6E6E6", light: "#262626", adjustContrast: false },
};

export const SUMMARY_PROMPT = `Please summarize this content to 5 key
takeaway bulletpoints followed by a short summary:

Content:\n\n`;
