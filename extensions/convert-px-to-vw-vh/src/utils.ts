import { addToHistoryHeight } from "./history";
import { Keyboard } from "@raycast/api";

export function pixelToViewportUnit(sizes: any) {
  const pixelValue = parseInt(sizes.pixels);
  const viewportValueHeight = sizes.height;
  const viewportValueWidth = sizes.width;

  if (sizes.height && sizes.width === null) {
    const result = ((pixelValue / viewportValueHeight) * 100).toFixed(3);
    addToHistoryHeight({ value: `${result}vh`, label: `${viewportValueHeight}px / ${sizes.pixels}px → ${result}vh` });
    return result;
  } else if (sizes.width && sizes.height === null) {
    const result = ((pixelValue / viewportValueWidth) * 100).toFixed(3);
    addToHistoryHeight({ value: `${result}vw`, label: `${viewportValueWidth}px / ${sizes.pixels}px → ${result}vw` });
    return result;
  }
}

export function getShortcut(index: number) {
  const key = index + 1;

  let shortcut: Keyboard.Shortcut | undefined;
  if (key >= 1 && key <= 9) {
    shortcut = { modifiers: ["cmd"], key: String(key) as Keyboard.KeyEquivalent };
  }

  return shortcut;
}
