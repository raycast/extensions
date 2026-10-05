/**
 * How a document type reads in a list: a label and an icon. The API returns
 * the raw `documentType` id (`card`, `notes`, `family-tree-v2`…); this is the
 * one place those ids get a face. Unknown types — an installed third-party tool
 * — fall back to a generic document with a humanized label, never a blank.
 * Pure: unit-tested with node --test; the icon is a key into Raycast's Icon.
 */

export type KindIcon =
  | "Document"
  | "Layers"
  | "Text"
  | "Folder"
  | "Map"
  | "Calendar"
  | "Book"
  | "Pencil"
  | "BulletPoints"
  | "Network"
  | "Tree"
  | "Link"
  | "BarChart"
  | "Microphone"
  | "Music"
  | "Brush"
  | "CheckList"
  | "Video"
  | "Compass"
  | "Bubble"
  | "Emoji"

export interface DocumentKind {
  label: string
  icon: KindIcon
}

const KINDS: Record<string, DocumentKind> = {
  card: { label: "Card", icon: "Layers" },
  "shared-cards": { label: "Cards", icon: "Layers" },
  notes: { label: "Note", icon: "Text" },
  note: { label: "Note", icon: "Text" },
  folder: { label: "Folder", icon: "Folder" },
  map: { label: "Map", icon: "Map" },
  atlas: { label: "Map", icon: "Map" },
  region: { label: "Region", icon: "Map" },
  cartographer: { label: "Map", icon: "Map" },
  timeline: { label: "Timeline", icon: "Calendar" },
  story: { label: "Story", icon: "Book" },
  chapter: { label: "Chapter", icon: "Pencil" },
  codex: { label: "Codex", icon: "Book" },
  dictionary: { label: "Dictionary", icon: "Book" },
  table: { label: "Table", icon: "BulletPoints" },
  sheet: { label: "Sheet", icon: "BulletPoints" },
  graph: { label: "Graph", icon: "Network" },
  "family-tree": { label: "Family Tree", icon: "Tree" },
  "family-tree-v2": { label: "Family Tree", icon: "Tree" },
  embed: { label: "Embed", icon: "Link" },
  "radar-chart": { label: "Radar Chart", icon: "BarChart" },
  "voice-memo": { label: "Voice Memo", icon: "Microphone" },
  soundscape: { label: "Soundscape", icon: "Music" },
  playlist: { label: "Playlist", icon: "Music" },
  canvas: { label: "Canvas", icon: "Brush" },
  "canvas-v2": { label: "Canvas", icon: "Brush" },
  board: { label: "Board", icon: "Brush" },
  "todo-list": { label: "To-do List", icon: "CheckList" },
  animator: { label: "Animator", icon: "Video" },
  animation: { label: "Animation", icon: "Video" },
  campaign: { label: "Campaign", icon: "Compass" },
  "dialogue-tree": { label: "Dialogue Tree", icon: "Bubble" },
  dice: { label: "Dice", icon: "Emoji" },
  "dice-roller": { label: "Dice", icon: "Emoji" },
}

/** `some-installed-tool` → "Some Installed Tool". */
export function humanizeType(type: string): string {
  return type
    .split(/[-_:.]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ")
}

export function documentKind(type: string | null | undefined): DocumentKind {
  if (!type) return { label: "Document", icon: "Document" }
  return KINDS[type] ?? { label: humanizeType(type), icon: "Document" }
}
