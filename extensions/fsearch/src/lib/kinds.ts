import type { Filters } from "./fsearch";

/** The search bar's kind menu. Each maps to fsearch filters. */
export const KINDS: { value: string; title: string; filters: Filters }[] = [
  { value: "all", title: "All Kinds", filters: {} },
  { value: "file", title: "Files", filters: { kind: "file" } },
  { value: "folder", title: "Folders", filters: { kind: "dir" } },
  // Not `type:app`: fsearch requires a folder there, and the system apps in
  // /Applications are symlinks into the Cryptex volume, so Safari drops out.
  { value: "app", title: "Applications", filters: { ext: "app" } },
  { value: "image", title: "Images", filters: { type: "image" } },
  { value: "doc", title: "Documents", filters: { type: "doc" } },
  { value: "code", title: "Code", filters: { type: "code" } },
  { value: "video", title: "Videos", filters: { type: "video" } },
  { value: "audio", title: "Audio", filters: { type: "audio" } },
  { value: "archive", title: "Archives", filters: { type: "archive" } },
  { value: "font", title: "Fonts", filters: { type: "font" } },
];

export function filtersFor(kind: string): Filters {
  return KINDS.find((k) => k.value === kind)?.filters ?? {};
}
