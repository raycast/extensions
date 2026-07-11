import { Color } from "@raycast/api";

const colors = [Color.Red, Color.Orange, Color.Yellow, Color.Green, Color.Blue, Color.Purple, Color.Magenta];

// Function-based hash code generation
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

export function getColorForTag(tag: string): Color {
  const hash = hashCode(tag);
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
