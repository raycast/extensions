import { Icon } from "@raycast/api";
import { normalizeHex } from "./color";

export function colorSwatch(hex: string) {
  return {
    source: Icon.Circle,
    tintColor: normalizeHex(hex) ?? "#808080",
  };
}
