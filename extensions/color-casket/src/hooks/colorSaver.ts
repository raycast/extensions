import { LocalStorage } from "@raycast/api";
import { AvailableColor } from "../colors/Color";
import { createColor } from "../typeUtilities";

export interface SerializedColor {
  value: string;
  savedAt: number;
}

export interface SavedColor {
  instance: AvailableColor;
  savedAt: number;
}

function serialize(color: SavedColor): SerializedColor {
  return {
    value: color.instance.stringValue(),
    savedAt: color.savedAt,
  };
}

function unserialize(color: SerializedColor): SavedColor {
  return {
    instance: createColor(color.value),
    savedAt: color.savedAt,
  };
}

export function update(key: string, items: SavedColor[]) {
  LocalStorage.setItem(key, JSON.stringify(items.map((color) => serialize(color))));
}

export async function list(key: string): Promise<SavedColor[]> {
  return JSON.parse((await LocalStorage.getItem(key)) || "[]").map((color: SerializedColor) => unserialize(color));
}

export async function prepend(key: string, color: AvailableColor) {
  const items = await list(key);

  items.unshift({
    instance: color,
    savedAt: Date.now(),
  });

  update(key, items);
}
