export const MAX_RENDERED_NOTES = 1000;
export const BYTES_PER_KILOBYTE = 1024;
export const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE ** 2;
export const BYTES_PER_GIGABYTE = BYTES_PER_MEGABYTE ** 2;

export enum NoteAction {
  Pin,
  Edit,
  Delete,
  Append,
}

export enum PrimaryAction {
  QuickLook = "quicklook",
  OpenInObsidian = "obsidian",
}

export const CURRENT_EXTENSION_VERSION = "1.7.0";
export const APPLICATION_UUID = "49acc9ee-69a0-4419-9aad-5c2689ff0119";

export const INLINE_TAGS_REGEX = /[\s\n](#[a-zA-Z_0-9/-]+)/g;
export const YAML_FRONTMATTER_REGEX = /---\s([\s\S]*)---/g;
export const LATEX_REGEX = /\$\$(.|\n)*?\$\$/gm;
export const LATEX_INLINE_REGEX = /\$(.|\n)*?\$/gm;

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
