import { Lights } from "./interfaces";
import { getProgressIcon } from "@raycast/utils";
import { Color, Icon } from "@raycast/api";
const hsl = require("hsl-to-hex");
const kelvinToRgb = require("kelvin-to-rgb");

export function getLightIcon(lightState: Lights.Light) {
  const progress = lightState.brightness;
  if (lightState.color !== undefined) {
    if (lightState.power == "off") {
      return getProgressIcon(progress, Color.SecondaryText);
    } else {
      const hex = hsl(lightState.color.hue, 100, 60);
      return getProgressIcon(progress, hex);
    }
  } else {
    return getProgressIcon(progress, "white");
  }
}

export function getHueIcon(hue: number) {
  if (hue !== undefined) {
    const hex = hsl(hue, 100, 60);
    return { source: Icon.CircleFilled, tintColor: hex };
  } else {
    return { source: Icon.CircleFilled, tintColor: Color.SecondaryText };
  }
}

export function getKelvinIcon(kelvin: number) {
  const rgb = kelvinToRgb(kelvin);
  const formattedColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

  return { source: Icon.CircleFilled, tintColor: formattedColor };
}

export function parseDate(date: Date) {
  const mut = new Date(date);
  return mut.toLocaleString();
}
