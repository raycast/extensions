import { Lights } from "./interfaces";
import { getProgressIcon } from "@raycast/utils";
import { Icon } from "@raycast/api";
const kelvinToRgb = require("kelvin-to-rgb");

export function getLightIcon(lightState: Lights.Light) {
  const progress = lightState.brightness / 100;
  const rgb = kelvinToRgb(lightState.color.kelvin);
  const formattedColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

  return getProgressIcon(progress, formattedColor);
}

export function getKelvinIcon(kelvin: number) {
  const rgb = kelvinToRgb(kelvin);
  const formattedColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

  return { source: Icon.CircleFilled, tintColor: formattedColor };
}
