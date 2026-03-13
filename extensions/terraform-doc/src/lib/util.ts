import { Color } from "@raycast/api";

function hashStringToInt(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash += str.charCodeAt(i);
  }
  return hash;
}

export function hashColorizer(text: string): Color {
  const hashNum = hashStringToInt(text);
  const selector = hashNum % 7;
  switch (selector) {
    case 0:
      return Color.Blue;
    case 1:
      return Color.Green;
    case 2:
      return Color.Orange;
    case 3:
      return Color.Purple;
    case 4:
      return Color.Red;
    case 5:
      return Color.Yellow;
    case 6:
      return Color.Magenta;
    default:
      return Color.PrimaryText;
  }
}
