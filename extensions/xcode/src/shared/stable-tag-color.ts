import { Color } from "@raycast/api";

/**
 * The colors available for tags
 */
const tagColors = [Color.Blue, Color.Green, Color.Magenta, Color.Orange, Color.Purple, Color.Red, Color.Yellow];

/**
 * Returns a tag color which is always the same for the given name
 * @param name The name
 */
export function StableTagColor(name: string): Color {
  let hash = 0;
  for (let index = 0; index < name.length; index++) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return tagColors[hash % tagColors.length];
}
