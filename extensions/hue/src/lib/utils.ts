import { Color, environment, getPreferenceValues, Icon, Image } from "@raycast/api";
import { Light } from "./types";

export function mapRange(value: number, from: [number, number], to: [number, number]) {
  return to[0] + ((value - from[0]) * (to[1] - to[0])) / (from[1] - from[0]);
}

export function getLightIcon(light: Light) {
  // TODO: Use dimming state and color(_temperature) to determine icon color
  // const color = getRgbFrom(lightState);

  return {
    source: `icons/${light.metadata.archetype}.png`,
    tintColor: light.on.on ? "white" : "gray",
  };
}

export function getIconForColor(color: CssColor): Image {
  return { source: Icon.CircleFilled, tintColor: { light: color.value, dark: color.value, adjustContrast: false } };
}

export function getTransitionTimeInMs(): number {
  return Math.round(parseInt(getPreferenceValues().transitionTime) / 100);
}
