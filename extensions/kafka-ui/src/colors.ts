import { Color } from "@raycast/api";
import { EnvColorValue, StoredEnvironment } from "./types";

export const COLOR_MAP: Record<EnvColorValue, Color> = {
  Blue: Color.Blue,
  Green: Color.Green,
  Orange: Color.Orange,
  Red: Color.Red,
  Purple: Color.Purple,
  Yellow: Color.Yellow,
  Magenta: Color.Magenta,
};

export const COLOR_ICON_MAP = COLOR_MAP;

export function resolveEnvColor(env: StoredEnvironment): Color {
  return COLOR_MAP[env.color] ?? Color.Blue;
}
