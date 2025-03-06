import { isValidHSL, isValidRGB, isValidColorName } from "is-valid-css-color";

function isValidHEX(color: string) {
  return /^#([A-Fa-f0-9]{3}){1,2}$/.test(color);
}

function getValidColor(text: string): string {
  if ((text.length === 3 || text.length === 6) && isValidHEX("#" + text)) {
    return "#" + text;
  }
  return isValidHEX(text) || isValidHSL(text) || isValidRGB(text) || isValidColorName(text) ? text : "";
}

export { isValidHEX, isValidHSL, isValidRGB, isValidColorName, getValidColor };
