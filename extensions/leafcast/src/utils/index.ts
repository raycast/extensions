import tinycolor from "tinycolor2";
import { HsvWithName } from "../types";

export function createHsvColorWithName(color: tinycolor.ColorFormats.HSV): HsvWithName {
  const colorObj = tinycolor(color);
  const colorName = colorObj.toName() || colorObj.toHexString();

  const hsvColorWithName: HsvWithName = {
    hsv: color,
    name: colorName,
  };

  return hsvColorWithName;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
