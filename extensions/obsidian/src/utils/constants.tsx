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
