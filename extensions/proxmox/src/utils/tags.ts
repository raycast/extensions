import { Color } from "@raycast/api";

/** The characters Proxmox accepts in a tag */
const TAG_PATTERN = /^[a-z0-9_][a-z0-9_+.-]*$/i;

const TAG_COLORS = [Color.Blue, Color.Green, Color.Magenta, Color.Orange, Color.Purple, Color.Red, Color.Yellow];

export function parseTags(tags?: string): string[] {
  return (tags ?? "").split(";").filter((tag) => tag !== "");
}

export function normalizeTag(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, "-");
}

export function isValidTag(tag: string): boolean {
  return TAG_PATTERN.test(tag);
}

/** Picks a color from the tag name, so a tag keeps its color everywhere */
export function getTagColor(tag: string): Color {
  let hash = 0;
  for (const char of tag) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}
