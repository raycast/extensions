import { Rgb, Xy } from "../lib/types";
import { BRIGHTNESSES, MIRED_MAX, MIRED_MIN, MIRED_STEP } from "./constants";
import chroma from "chroma-js";

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
 */
export function xyToRgbHexString({ x, y }: Xy) {
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

  // If one component is greater than 1, weight components by that value. chroma clips negative components to zero.
  const max = Math.max(red, green, blue, 1);
  return chroma.gl(red / max, green / max, blue / max).hex();
}

/**
 * The Hue app draws whites from its own palette rather than the black-body curve: its coolest white is mint. These are
 * its colors at 153, 346 and 454 mirek, read from its room cards. Colors between them blend in OKLab, and beyond them
 * the nearest segment continues, so color lights' 455-500 mirek get warmer still.
 */
const WHITES: [number, string][] = [
  [153, "#d3ebdc"],
  [346, "#ffe7a1"],
  [454, "#ffca6a"],
];

/**
 * Converts color temperature in mireds to a hex string
 *
 * @param {number} mireds Philips Hue color temperature value (153-500)
 */
export function miredToHexString(mireds: number) {
  const next = WHITES.findIndex(([mired]) => mired >= mireds);
  const end = next === -1 ? WHITES.length - 1 : Math.max(next, 1);
  const [[fromMired, fromColor], [toMired, toColor]] = [WHITES[end - 1], WHITES[end]];
  return chroma.mix(fromColor, toColor, (mireds - fromMired) / (toMired - fromMired), "oklab").hex();
}

/**
 * Converts a CIE (x, y) color to the color temperature of the nearest white, in mireds, by McCamy's approximation.
 * Returns undefined for colors more than 0.02 Duv from the whites, where the approximation gives nonsense.
 *
 * @link https://en.wikipedia.org/wiki/Color_temperature#Approximation
 * @link https://doi.org/10.1080/15502724.2014.839020 (Ohno's Duv approximation, from CIE 1960 u and v)
 */
export function xyToMired({ x, y }: Xy): number | undefined {
  const d = 12 * y - 2 * x + 3;
  const u = (4 * x) / d - 0.292;
  const v = (6 * y) / d - 0.24;
  const angle = Math.acos(u / Math.hypot(u, v));
  const curve = [-0.471106, 1.925865, -2.4243787, 1.5317403, -0.5179722, 0.0893944, -0.00616793];
  const duv = Math.hypot(u, v) - curve.reduce((sum, k, i) => sum + k * angle ** i, 0);
  const n = (x - 0.332) / (0.1858 - y);
  return Math.abs(duv) <= 0.02 ? 1_000_000 / (449 * n ** 3 + 3525 * n ** 2 + 6823.3 * n + 5520.33) : undefined;
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

export function calculateAdjustedColorTemperature(mired: number, direction: "warmer" | "cooler") {
  const newColorTemperature = direction === "warmer" ? mired + MIRED_STEP : mired - MIRED_STEP;
  return Math.round(Math.min(Math.max(MIRED_MIN, newColorTemperature), MIRED_MAX));
}
