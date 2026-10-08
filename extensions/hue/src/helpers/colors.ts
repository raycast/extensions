import { Rgb, Xy } from "../lib/types";
import { BRIGHTNESSES, MIRED_MAX, MIRED_MIN, MIRED_STEP } from "./constants";
import chroma from "chroma-js";

/**
 * The mired from Hue’s API is too warm, so we make it cooler by an arbitrary amount
 */
const CT_MIRED_ADJUSTMENT = -50;
const CT_HUE_ADJUSTMENT = 8;

/**
 * Converts an RGB value to a CIE (x, y) color and brightness (0-100)
 *
 * @link https://developers.meethue.com/develop/application-design-guidance/color-conversion-formulas-rgb-to-xy-and-back/#Color-rgb-to-xy
 * @param {Rgb} rgb RGB object with values between 0 and 255
 */
function rgbToXyBri({ r, g, b }: Rgb): { xy: Xy; brightness: number } {
  function applyGammaCorrection(value: number) {
    return value > 0.04045 ? Math.pow((value + 0.055) / (1.0 + 0.055), 2.4) : value / 12.92;
  }

  // Apply a gamma correction to the RGB values, which makes the color more vivid
  // and more like the color displayed on the screen of your device
  const red = applyGammaCorrection(r / 255);
  const green = applyGammaCorrection(g / 255);
  const blue = applyGammaCorrection(b / 255);

  // RGB values to XYZ using the Wide RGB D65 conversion formula
  const X: number = red * 0.664511 + green * 0.154324 + blue * 0.162028;
  const Y: number = red * 0.283881 + green * 0.668433 + blue * 0.047685;
  const Z: number = red * 0.000088 + green * 0.07231 + blue * 0.986039;

  // Calculate the xy values from the XYZ values
  let x: number = X / (X + Y + Z);
  let y: number = Y / (X + Y + Z);
  const brightness: number = Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b) * (100 / 255);

  if (isNaN(x)) x = 0;
  if (isNaN(y)) y = 0;

  return { xy: { x, y }, brightness };
}

/**
 * Converts a hex color string to a CIE (x, y) color and brightness (0-100).
 */
export function hexToXy(color: string): { xy: Xy; brightness: number } {
  const [r, g, b] = chroma(color).rgb();
  return rgbToXyBri({ r, g, b });
}

/**
 * Converts a CIE (x, y) color to a hex color string.
 *
 * @link https://developers.meethue.com/develop/application-design-guidance/color-conversion-formulas-rgb-to-xy-and-back/#xy-to-rgb-color
 * @param {Xy} xy
 * @param brightness Brightness of the light (0 – 100)
 */
export function xyToRgbHexString({ x, y }: Xy, brightness = 100) {
  if (y === 0) return "#000000";

  function applyReverseGammaCorrection(value: number) {
    return value <= 0.0031308 ? 12.92 * value : (1.0 + 0.055) * Math.pow(value, 1.0 / 2.4) - 0.055;
  }

  const z = 1.0 - x - y;
  const Y = 1;
  const X = (Y / y) * x;
  const Z = (Y / y) * z;

  // Convert to RGB using Wide RGB D65 conversion
  let red = X * 1.656492 - Y * 0.354851 - Z * 0.255038;
  let green = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
  let blue = X * 0.051713 - Y * 0.121364 + Z * 1.01153;

  // If red, green or blue is larger than 1.0 set it back to the maximum of 1.0.
  if (red > blue && red > green && red > 1.0) {
    green = green / red;
    blue = blue / red;
    red = 1.0;
  } else if (green > blue && green > red && green > 1.0) {
    red = red / green;
    blue = blue / green;
    green = 1.0;
  } else if (blue > red && blue > green && blue > 1.0) {
    red = red / blue;
    green = green / blue;
    blue = 1.0;
  }

  //Reverse gamma correction
  red = applyReverseGammaCorrection(red);
  green = applyReverseGammaCorrection(green);
  blue = applyReverseGammaCorrection(blue);

  // Bring all negative components to zero
  red = Math.max(red, 0);
  green = Math.max(green, 0);
  blue = Math.max(blue, 0);

  // If one component is greater than 1, weight components by that value
  const max = Math.max(red, green, blue);
  if (max > 1) {
    red = red / max;
    green = green / max;
    blue = blue / max;
  }

  return chroma
    .rgb(Math.round(red * 255), Math.round(green * 255), Math.round(blue * 255))
    .darken(1 - brightness / 100)
    .hex();
}

/**
 * Converts color temperature in mireds to a hex string
 *
 * @param {number} mireds Philips Hue color temperature value (153-500)
 * @param brightness Brightness of the light (1-100)
 */
export function miredToHexString(mireds: number, brightness = 100) {
  const color = chroma.temperature(1_000_000 / (mireds + CT_MIRED_ADJUSTMENT));
  return color
    .set("hsl.h", color.get("hsl.h") + CT_HUE_ADJUSTMENT)
    .darken(1 - brightness / 100)
    .hex();
}

/**
 * Converts a CIE (x, y) color to the color temperature of the nearest white, in mireds, by McCamy's approximation.
 * Colors far from white get temperatures outside the Hue range.
 *
 * @link https://en.wikipedia.org/wiki/Color_temperature#Approximation
 */
export function xyToMired({ x, y }: Xy) {
  const n = (x - 0.332) / (0.1858 - y);
  return 1_000_000 / (449 * n ** 3 + 3525 * n ** 2 + 6823.3 * n + 5520.33);
}

/**
 * Because the Hue API does not return the exact brightness value that was set,
 * we need to find the closest brightness so that we can update the UI accordingly.
 */
export function getClosestBrightness(brightness: number) {
  return BRIGHTNESSES.reduce((prev, curr) => {
    return Math.abs(curr - brightness) < Math.abs(prev - brightness) ? curr : prev;
  });
}

export function calculateAdjustedBrightness(brightness: number, direction: "increase" | "decrease") {
  const index = BRIGHTNESSES.indexOf(getClosestBrightness(brightness));
  return BRIGHTNESSES[index + (direction === "increase" ? -1 : 1)] ?? BRIGHTNESSES[index];
}

export function calculateAdjustedColorTemperature(mired: number, direction: "increase" | "decrease") {
  const newColorTemperature = direction === "increase" ? mired - MIRED_STEP : mired + MIRED_STEP;
  return Math.round(Math.min(Math.max(MIRED_MIN, newColorTemperature), MIRED_MAX));
}
