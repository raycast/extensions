import { Color } from "@raycast/api";

const PALETTE = [Color.Red, Color.Orange, Color.Yellow, Color.Green, Color.Blue, Color.Purple, Color.Magenta];

// Deterministic color from the tag name: stable everywhere (form, lists,
// picker) with no lookup or storage, and evenly spread across the palette.
export function tagColor(name: string): Color {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
