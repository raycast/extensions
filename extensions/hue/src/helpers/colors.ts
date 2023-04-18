import { Rgb, Xy } from "../lib/types";
import { BRIGHTNESSES, MIRED_MAX, MIRED_MIN, MIRED_STEP } from "./constants";
import chroma from "chroma-js";

/**
 * The mired from Hue’s API is too warm, so we make it cooler by an arbitrary amount
 */
const CT_MIRED_ADJUSTMENT = -50;
const CT_HUE_ADJUSTMENT = 8;

/**
 * Converts an RGB value to a CIE (x, y) color representation
 *
 * @link https://developers.meethue.com/develop/application-design-guidance/color-conversion-formulas-rgb-to-xy-and-back/#Color-rgb-to-xy
 * @param {Rgb} rgb RGB object with values between 0 and 255
 */
export function rgbToXyBri({ r, g, b }: Rgb): { xy: Xy; brightness: number } {
  function applyGammaCorrection(value: number) {
    return value > 0.04045 ? Math.pow((value + 0.055) / (1.0 + 0.055), 2.4) : value / 12.92;
  }

  // Apply a gamma correction to the RGB values, which makes the color more vivid
  // and more the like the color displayed on the screen of your device
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
 * Converts a hex color string to a CIE (x, y) color.
 */
export function hexToXy(color: string): { xy: Xy; brightness: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  const [r, g, b] = result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
  return rgbToXyBri({ r, g, b });
}

/**
 * Converts a CIE (x, y) color to an RGB color string.
 *
 * @link https://developers.meethue.com/develop/application-design-guidance/color-conversion-formulas-rgb-to-xy-and-back/#xy-to-rgb-color
 * @param {Xy} xy
 * @param brightness Brightness of the light (0 – 100)
 */
export function xyBriToRgb({ x, y }: Xy, brightness = 100): Rgb {
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

  const [r, g, b] = chroma
    .rgb(Math.round(red * 255), Math.round(green * 255), Math.round(blue * 255))
    .darken(1 - brightness / 100)
    .rgb();

  // Round the values to the nearest integer and divide by the brightness
  return { r, g, b };
}

export function xyToRgbHexString(xy: Xy, brightness = 100) {
  const { r, g, b } = xyBriToRgb(xy, brightness);
  const redHex = r.toString(16).padStart(2, "0");
  const greenHex = g.toString(16).padStart(2, "0");
  const blueHex = b.toString(16).padStart(2, "0");
  return `#${redHex}${greenHex}${blueHex}`;
}

/**
 * Converts color temperature in mireds to an RGB object
 *
 * @param {number} mireds Philips Hue color temperature value (153-500)
 * @param {number} brightness Brightness of the light (1-100)
 * @returns {string} RGB string
 */
export function miredToRgb(mireds: number, brightness = 100): Rgb {
  const hecTemp = 1_000_000 / (mireds + CT_MIRED_ADJUSTMENT);

  const color = chroma.temperature(hecTemp);
  const [r, g, b] = color
    .set("hsl.h", color.get("hsl.h") + CT_HUE_ADJUSTMENT)
    .darken(1 - brightness / 100)
    .rgb();

  return { r, g, b };
}

/**
 * Converts color temperature in mireds to an RGB string
 *
 * @param {number} mireds Philips Hue color temperature value (153-500)
 * @param {number} brightness Brightness of the light (1-100)
 */
export function miredToRgbString(mireds: number, brightness = 100) {
  const rgb = miredToRgb(mireds, brightness);
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

/**
 * Converts color temperature in mireds to a hex string
 *
 * @param {number} mireds Philips Hue color temperature value (153-500)
 * @param brightness Brightness of the light (1-100)
 */
export function miredToHexString(mireds: number, brightness = 100) {
  const { r, g, b } = miredToRgb(mireds, brightness);
  const redHex = r.toString(16).padStart(2, "0");
  const greenHex = g.toString(16).padStart(2, "0");
  const blueHex = b.toString(16).padStart(2, "0");
  return `#${redHex}${greenHex}${blueHex}`;
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
  const closestBrightness = getClosestBrightness(brightness);
  const sortedBrightnesses = direction === "decrease" ? BRIGHTNESSES : [...BRIGHTNESSES].reverse();

  return (
    sortedBrightnesses.find((b) => {
      return direction === "increase" ? b > closestBrightness : b < closestBrightness;
    }) ?? closestBrightness
  );
}

export function calculateAdjustedColorTemperature(mired: number, direction: "increase" | "decrease") {
  const newColorTemperature = direction === "increase" ? mired - MIRED_STEP : mired + MIRED_STEP;
  return Math.round(Math.min(Math.max(MIRED_MIN, newColorTemperature), MIRED_MAX));
}
