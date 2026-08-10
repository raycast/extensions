import { Color, Icon } from "@raycast/api";
import { DISPLAY_THRESHOLDS } from "../constants";

export const centsToDisplayObject = (
  cents: number,
): {
  color: Color;
  icon: Icon;
} => {
  const absCents = Math.abs(cents);

  const color =
    absCents <= DISPLAY_THRESHOLDS.inTune
      ? Color.Green
      : absCents <= DISPLAY_THRESHOLDS.close
        ? Color.Orange
        : Color.Red;

  const icon = absCents <= DISPLAY_THRESHOLDS.inTune ? Icon.Checkmark : cents > 0 ? Icon.ArrowDown : Icon.ArrowUp;

  return { color, icon };
};
