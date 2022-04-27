import { isValidHSL, isValidRGB, isValidColorName } from "is-valid-css-color";

function isValidHEX(color: string) {
  return /^#([A-Fa-f0-9]{3}){1,2}$/.test(color);
}

export { isValidHEX, isValidHSL, isValidRGB, isValidColorName };
