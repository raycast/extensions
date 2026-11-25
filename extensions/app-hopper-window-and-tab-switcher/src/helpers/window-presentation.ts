import { Icon, type List } from "@raycast/api";
import type { WindowState } from "./window-utils";

export function getSpaceLabel(window: WindowState): string | undefined {
  return window.space !== undefined && Number.isSafeInteger(window.space) && window.space > 0
    ? `Space ${window.space}`
    : undefined;
}

/** Window rows show a quiet restore hint; normal and hidden states need no label. */
export function getWindowAccessories(window: WindowState): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (window.isMinimized === true) accessories.push({ icon: Icon.Minus, tooltip: "Minimized" });
  const space = getSpaceLabel(window);
  if (space) accessories.push({ text: space });
  return accessories;
}
