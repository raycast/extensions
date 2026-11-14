import { Color } from "@raycast/api";
import { directionOf } from "../lib/format";

const DIRECTION_COLOR = { up: Color.Green, down: Color.Red } as const;

/** Green for gains, red for losses, neutral when the value rounds to zero. */
export function changeColor(value: number): Color {
  const direction = directionOf(value);
  return direction ? DIRECTION_COLOR[direction] : Color.SecondaryText;
}
