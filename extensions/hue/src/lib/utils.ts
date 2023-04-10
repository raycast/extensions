import { getPreferenceValues, Icon, Image } from "@raycast/api";
import { getRgbFrom } from "./colors";
import { CssColor, LightState } from "./types";
import { getProgressIcon } from "@raycast/utils";

export function mapRange(value: number, from: [number, number], to: [number, number]) {
  return to[0] + ((value - from[0]) * (to[1] - to[0])) / (from[1] - from[0]);
}

export function getLightIcon(lightState: LightState) {
  const progress = lightState.on ? mapRange(lightState.bri, [1, 254], [0.1, 1]) : 0;
  const color = getRgbFrom(lightState);

  return getProgressIcon(progress, color);
}

export function getIconForColor(color: CssColor): Image {
  return { source: Icon.CircleFilled, tintColor: { light: color.value, dark: color.value, adjustContrast: false } };
}

export function getTransitionTimeInMs(): number {
  return Math.round(parseInt(getPreferenceValues().transitionTime) / 100);
}
