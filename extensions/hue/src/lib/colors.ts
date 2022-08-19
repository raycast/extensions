import { LightState, XY } from "./types";
import { environment } from "@raycast/api";
import { mapRange } from "./utils";

export function hexToXy(color: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  const [red, green, blue] = result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
  // const [red, green, blue] = hexToRgb(color);
  return rgbToCie(red, green, blue);
}

export function getRgbFrom(lightState: LightState): string {
  switch (lightState.colormode) {
    case "xy":
      return cieToRgb(lightState.xy, lightState.bri);
    case "ct":
      return ctToRgb(lightState.ct, lightState.bri);
    default:
      return environment.theme == "dark"
        ? `rgb(${logShadeRgb(255, 255, 255, -(1 - lightState.bri / 254))})`
        : `rgb(${logShadeRgb(0, 0, 0, 1 - lightState.bri / 254)})`;
  }
}

// Modified from: https://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
// Could be simplified further
function logShadeRgb(r: number, g: number, b: number, percentage: number) {
  const multiplier = percentage < 0 ? 0 : percentage * 255 ** 2;
  const signedPercentage = percentage < 0 ? 1 + percentage : 1 - percentage;

  const R = Math.round((signedPercentage * r ** 2 + multiplier) ** 0.5);
  const G = Math.round((signedPercentage * g ** 2 + multiplier) ** 0.5);
  const B = Math.round((signedPercentage * b ** 2 + multiplier) ** 0.5);
  return [R, G, B];
}

// region Modified diyHueUI color conversion
// Source: https://github.com/diyhue/diyHueUI/blob/97d2c53b0ab053dc44b1de6b499724652a14b504/src/color.js
/**
 * Converts a CIE (x, y) color to an RGB color string.
 * @param {XY} xy
 * @param {number} brightness
 * @returns {string}
 */
// TODO: Fix not handling some colors well (e.g. 'Maroon' turns purple)
export function cieToRgb(xy: XY, brightness: number) {
  //Set to maximum brightness if no custom value was given (Not the slick ECMAScript 6 way for compatibility reasons)
  if (brightness === undefined) {
    brightness = 254;
  }

  const z: number = 1.0 - xy[0] - xy[1];
  const Y: number = parseFloat((brightness / 254).toFixed(2));
  const X: number = (Y / xy[1]) * xy[0];
  const Z: number = (Y / xy[1]) * z;

  //Convert to RGB using Wide RGB D65 conversion
  let red: number = X * 1.656492 - Y * 0.354851 - Z * 0.255038;
  let green: number = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
  let blue: number = X * 0.051713 - Y * 0.121364 + Z * 1.01153;

  //If red, green or blue is larger than 1.0 set it back to the maximum of 1.0
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
  red = red <= 0.0031308 ? 12.92 * red : (1.0 + 0.055) * Math.pow(red, 1.0 / 2.4) - 0.055;
  green = green <= 0.0031308 ? 12.92 * green : (1.0 + 0.055) * Math.pow(green, 1.0 / 2.4) - 0.055;
  blue = blue <= 0.0031308 ? 12.92 * blue : (1.0 + 0.055) * Math.pow(blue, 1.0 / 2.4) - 0.055;

  //Convert normalized decimal to decimal
  red = Math.round(red * 255);
  green = Math.round(green * 255);
  blue = Math.round(blue * 255);

  if (isNaN(red)) red = 0;
  if (isNaN(green)) green = 0;
  if (isNaN(blue)) blue = 0;

  return `rgb(${Math.floor(red)},${Math.floor(green)},${Math.floor(blue)})`;
}

/**
 * Converts a CT to an RGB string
 * @param {number} mireds Philips Hue CT value
 * @param {number} brightness Brightness of the light (1-254)
 * @returns {string} RGB string
 */
export function ctToRgb(mireds: number, brightness: number): string {
  const hecTemp = 20000.0 / mireds;

  let red: number, green: number, blue: number;

  if (hecTemp <= 66) {
    red = 255;
    green = 99.4708025861 * Math.log(hecTemp) - 161.1195681661;
    blue = hecTemp <= 19 ? 0 : 138.5177312231 * Math.log(hecTemp - 10) - 305.0447927307;
  } else {
    red = 329.698727446 * Math.pow(hecTemp - 60, -0.1332047592);
    green = 288.1221695283 * Math.pow(hecTemp - 60, -0.0755148492);
    blue = 255;
  }

  const [shadedRed, shadedGreen, shadedBlue] = logShadeRgb(red, green, blue, mapRange(brightness, [1, 254], [-0.9, 0]));

  return `rgb(${shadedRed},${shadedGreen},${shadedBlue})`;
}

/**
 * Converts an RGB string to a CIE (x,y) color representation
 * @param {number} red
 * @param {number} green
 * @param {number} blue
 * @returns {XY}
 */
export function rgbToCie(red: number, green: number, blue: number): XY {
  //Apply a gamma correction to the RGB values, which makes the color more vivid and more the like the color displayed on the screen of your device
  red = red > 0.04045 ? Math.pow((red + 0.055) / (1.0 + 0.055), 2.4) : red / 12.92;
  green = green > 0.04045 ? Math.pow((green + 0.055) / (1.0 + 0.055), 2.4) : green / 12.92;
  blue = blue > 0.04045 ? Math.pow((blue + 0.055) / (1.0 + 0.055), 2.4) : blue / 12.92;

  //RGB values to XYZ using the Wide RGB D65 conversion formula
  const X: number = red * 0.664511 + green * 0.154324 + blue * 0.162028;
  const Y: number = red * 0.283881 + green * 0.668433 + blue * 0.047685;
  const Z: number = red * 0.000088 + green * 0.07231 + blue * 0.986039;

  //Calculate the xy values from the XYZ values
  let x: number = parseFloat((X / (X + Y + Z)).toFixed(4));
  let y: number = parseFloat((Y / (X + Y + Z)).toFixed(4));

  if (isNaN(x)) x = 0;
  if (isNaN(y)) y = 0;

  return [x, y];
}

// endregion
