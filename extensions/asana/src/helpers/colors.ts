import { Color } from "@raycast/api";

export enum AsanaColors {
  none = "none",
  red = "red",
  orange = "orange",
  yellowOrange = "yellowOrange",
  yellow = "yellow",
  yellowGreen = "yellowGreen",
  green = "green",
  blueGreen = "blueGreen",
  aqua = "aqua",
  blue = "blue",
  indigo = "indigo",
  purple = "purple",
  magenta = "magenta",
  hotPink = "hotPink",
  pink = "pink",
  gray = "gray",
}

export const raycastColors: Record<string, Color.ColorLike> = {
  [AsanaColors.none]: { light: "#6A7782", dark: "#CDD4DA" },
  [AsanaColors.red]: { light: "#D64854", dark: "#D64854" },
  [AsanaColors.orange]: { light: "#EB6B3E", dark: "#EB6B3E" },
  [AsanaColors.yellowOrange]: { light: "#D47600", dark: "#EF9E38" },
  [AsanaColors.yellow]: { light: "#BD9500", dark: "#E7C442" },
  [AsanaColors.yellowGreen]: { light: "#70920F", dark: "#ADCD4F" },
  [AsanaColors.green]: { light: "#43B93A", dark: "#80CE7A" },
  [AsanaColors.blueGreen]: { light: "#26B795", dark: "#65C2AC" },
  [AsanaColors.aqua]: { light: "#52A9E4", dark: "#52A9E4" },
  [AsanaColors.blue]: { light: "#5385D9", dark: "#5385D9" },
  [AsanaColors.indigo]: { light: "#7871E8", dark: "#7871E8" },
  [AsanaColors.purple]: { light: "#A067DC", dark: "#A067DC" },
  [AsanaColors.magenta]: { light: "#D36CDD", dark: "#D36CDD" },
  [AsanaColors.hotPink]: { light: "#D85A9B", dark: "#D85A9B" },
  [AsanaColors.pink]: { light: "#DC829A", dark: "#EE96AD" },
  [AsanaColors.gray]: { light: "#586769", dark: "#91A2A5" },
};

function getColorString(color: string) {
  switch (color) {
    case "none":
      return AsanaColors.none;
    case "dark-red":
    case "red":
      return AsanaColors.red;
    case "dark-orange":
    case "orange":
      return AsanaColors.orange;
    case "light-orange":
    case "yellow-orange":
      return AsanaColors.yellowOrange;
    case "dark-brown":
    case "yellow":
    case "light-yellow":
      return AsanaColors.yellow;
    case "light-green":
    case "yellow-green":
      return AsanaColors.yellowGreen;
    case "dark-green":
    case "green":
      return AsanaColors.green;
    case "light-teal":
    case "blue-green":
      return AsanaColors.blueGreen;
    case "dark-teal":
    case "aqua":
      return AsanaColors.aqua;
    case "light-blue":
    case "blue":
    case "dark-blue":
      return AsanaColors.blue;
    case "dark-purple":
    case "indigo":
      return AsanaColors.indigo;
    case "light-purple":
    case "purple":
      return AsanaColors.purple;
    case "light-pink":
    case "magenta":
      return AsanaColors.magenta;
    case "dark-pink":
    case "hot-pink":
      return AsanaColors.hotPink;
    case "light-red":
    case "pink":
      return AsanaColors.pink;
    case "light-warm-gray":
    case "dark-warm-gray":
    case "cool-gray":
      return AsanaColors.gray;
    default:
      return AsanaColors.none;
  }
}

export function asanaToRaycastColor(color: string) {
  return raycastColors[getColorString(color)];
}
