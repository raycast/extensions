import { environment } from "@raycast/api";
import { mapRange } from "./utils";
import { CssColor, Light, Xy } from "./types";
import chroma from "chroma-js";
import Jimp from "jimp";

export const COLORS: CssColor[] = [
  { name: "Alice Blue", value: "#f0f8ff" },
  { name: "Antique White", value: "#faebd7" },
  { name: "Aqua", value: "#00ffff" },
  { name: "Aqua Marine", value: "#7fffd4" },
  { name: "Azure", value: "#f0ffff" },
  { name: "Beige", value: "#f5f5dc" },
  { name: "Bisque", value: "#ffe4c4" },
  { name: "Blanched Almond", value: "#ffebcd" },
  { name: "Blue", value: "#0000ff" },
  { name: "Blue Violet", value: "#8a2be2" },
  { name: "Brown", value: "#a52a2a" },
  { name: "Burlywood", value: "#deb887" },
  { name: "Cadet Blue", value: "#5f9ea0" },
  { name: "Chartreuse", value: "#7fff00" },
  { name: "Chocolate", value: "#d2691e" },
  { name: "Coral", value: "#ff7f50" },
  { name: "Cornflower Blue", value: "#6495ed" },
  { name: "Cornsilk", value: "#fff8dc" },
  { name: "Crimson", value: "#dc143c" },
  { name: "Cyan", value: "#00ffff" },
  { name: "Dark Blue", value: "#00008b" },
  { name: "Dark Cyan", value: "#008b8b" },
  { name: "Dark Goldenrod", value: "#b8860b" },
  { name: "Dark Green", value: "#006400" },
  { name: "Dark Khaki", value: "#bdb76b" },
  { name: "Dark Magenta", value: "#8b008b" },
  { name: "Dark Olive Green", value: "#556b2f" },
  { name: "Dark Orange", value: "#ff8c00" },
  { name: "Dark Orchid", value: "#9932cc" },
  { name: "Dark Red", value: "#8b0000" },
  { name: "Dark Salmon", value: "#e9967a" },
  { name: "Dark Sea Green", value: "#8fbc8f" },
  { name: "Dark Slate Blue", value: "#483d8b" },
  { name: "Dark Turquoise", value: "#00ced1" },
  { name: "Dark Violet", value: "#9400d3" },
  { name: "Deep Pink", value: "#ff1493" },
  { name: "Deep Sky Blue", value: "#00bfff" },
  { name: "Dodger Blue", value: "#1e90ff" },
  { name: "Fire Brick", value: "#b22222" },
  { name: "Floral White", value: "#fffaf0" },
  { name: "Forest Green", value: "#228b22" },
  { name: "Fuchsia", value: "#ff00ff" },
  { name: "Gainsboro", value: "#dcdcdc" },
  { name: "Ghost White", value: "#f8f8ff" },
  { name: "Goldenrod", value: "#daa520" },
  { name: "Gold", value: "#ffd700" },
  { name: "Green", value: "#008000" },
  { name: "Green Yellow", value: "#adff2f" },
  { name: "Honey Dew", value: "#f0fff0" },
  { name: "Hot Pink", value: "#ff69b4" },
  { name: "Indian Red", value: "#cd5c5c" },
  { name: "Indigo", value: "#4b0082" },
  { name: "Ivory", value: "#fffff0" },
  { name: "Khaki", value: "#f0e68c" },
  { name: "Lavender Blush", value: "#fff0f5" },
  { name: "Lavender", value: "#e6e6fa" },
  { name: "Lawn Green", value: "#7cfc00" },
  { name: "Lemon Chiffon", value: "#fffacd" },
  { name: "Light Blue", value: "#add8e6" },
  { name: "Light Coral", value: "#f08080" },
  { name: "Light Cyan", value: "#e0ffff" },
  { name: "Light Goldenrod Yellow", value: "#fafad2" },
  { name: "Light Green", value: "#90ee90" },
  { name: "Light Pink", value: "#ffb6c1" },
  { name: "Light Salmon", value: "#ffa07a" },
  { name: "Light Sea Green", value: "#20b2aa" },
  { name: "Light Sky Blue", value: "#87cefa" },
  { name: "Light Steel Blue", value: "#b0c4de" },
  { name: "Light Yellow", value: "#ffffe0" },
  { name: "Lime", value: "#00ff00" },
  { name: "Lime Green", value: "#32cd32" },
  { name: "Linen", value: "#faf0e6" },
  { name: "Magenta", value: "#ff00ff" },
  { name: "Maroon", value: "#800000" },
  { name: "Medium Aqua Marine", value: "#66cdaa" },
  { name: "Medium Blue", value: "#0000cd" },
  { name: "Medium Orchid", value: "#ba55d3" },
  { name: "Medium Purple", value: "#9370db" },
  { name: "Medium Sea Green", value: "#3cb371" },
  { name: "Medium Slate Blue", value: "#7b68ee" },
  { name: "Medium Spring Green", value: "#00fa9a" },
  { name: "Medium Turquoise", value: "#48d1cc" },
  { name: "Medium Violet Red", value: "#c71585" },
  { name: "Midnight Blue", value: "#191970" },
  { name: "Mint Cream", value: "#f5fffa" },
  { name: "Misty Rose", value: "#ffe4e1" },
  { name: "Moccasin", value: "#ffe4b5" },
  { name: "Navajo White", value: "#ffdead" },
  { name: "Navy", value: "#000080" },
  { name: "Oldlace", value: "#fdf5e6" },
  { name: "Olive", value: "#808000" },
  { name: "Olive Drab", value: "#6b8e23" },
  { name: "Orange", value: "#ffa500" },
  { name: "Orange Red", value: "#ff4500" },
  { name: "Orchid", value: "#da70d6" },
  { name: "Pale Goldenrod", value: "#eee8aa" },
  { name: "Pale Green", value: "#98fb98" },
  { name: "Pale Turquoise", value: "#afeeee" },
  { name: "Pale Violet Red", value: "#db7093" },
  { name: "Papaya Whip", value: "#ffefd5" },
  { name: "Peach Puff", value: "#ffdab9" },
  { name: "Peru", value: "#cd853f" },
  { name: "Pink", value: "#ffc0cb" },
  { name: "Plum", value: "#dda0dd" },
  { name: "Powder Blue", value: "#b0e0e6" },
  { name: "Purple", value: "#800080" },
  { name: "Rebecca Purple", value: "#663399" },
  { name: "Red", value: "#ff0000" },
  { name: "Rosy Brown", value: "#bc8f8f" },
  { name: "Royal Blue", value: "#4169e1" },
  { name: "Saddle Brown", value: "#8b4513" },
  { name: "Salmon", value: "#fa8072" },
  { name: "Sandy Brown", value: "#f4a460" },
  { name: "Sea Green", value: "#2e8b57" },
  { name: "Sea Shell", value: "#fff5ee" },
  { name: "Sienna", value: "#a0522d" },
  { name: "Silver", value: "#c0c0c0" },
  { name: "Sky Blue", value: "#87ceeb" },
  { name: "Slate Blue", value: "#6a5acd" },
  { name: "Snow", value: "#fffafa" },
  { name: "Spring Green", value: "#00ff7f" },
  { name: "Steel Glue", value: "#4682b4" },
  { name: "Tan", value: "#d2b48c" },
  { name: "Teal", value: "#008080" },
  { name: "Thistle", value: "#d8bfd8" },
  { name: "Tomato", value: "#ff6347" },
  { name: "Turquoise", value: "#40e0d0" },
  { name: "Violet", value: "#ee82ee" },
  { name: "Wheat", value: "#f5deb3" },
  { name: "White", value: "#ffffff" },
  { name: "White Smoke", value: "#f5f5f5" },
  { name: "Yellow", value: "#ffff00" },
  { name: "Yellow Green", value: "#9acd32" }
];

export function hexToXy(color: string): Xy {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  const [red, green, blue] = result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
  // const [red, green, blue] = hexToRgb(color);
  return rgbToCie(red, green, blue);
}

export function getRgbFrom(light: Light): string {
  if (light.color?.xy !== undefined) {
    return cieToRgbString(light.color.xy, light.dimming?.brightness);
  } else if (light.color_temperature !== undefined) {
    return ctToRgb(light.color_temperature.mirek, light.dimming?.brightness);
  } else {
    const brightness = (light.dimming?.brightness ?? 100) / 100;
    return environment.theme == "dark"
      ? `rgb(${logShadeRgb(255, 255, 255, -brightness)})`
      : `rgb(${logShadeRgb(0, 0, 0, brightness)})`;
  }
}

/**
 * Lightens or darkens a color by a percentage.
 * @link https://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
 * @param r
 * @param g
 * @param b
 * @param percentage
 */
function logShadeRgb(r: number, g: number, b: number, percentage: number) {
  const multiplier = percentage < 0 ? 0 : percentage * 255 ** 2;
  const signedPercentage = percentage < 0 ? 1 + percentage : 1 - percentage;

  const R = Math.round((signedPercentage * r ** 2 + multiplier) ** 0.5);
  const G = Math.round((signedPercentage * g ** 2 + multiplier) ** 0.5);
  const B = Math.round((signedPercentage * b ** 2 + multiplier) ** 0.5);
  return [R, G, B];
}

/**
 * Converts a CIE (x, y) color to an RGB color string.
 * @link https://github.com/diyhue/diyHueUI/blob/97d2c53b0ab053dc44b1de6b499724652a14b504/src/color.js
 * @param {Xy} xy
 * @param {number} brightness
 * @returns {string}
 */
export function cieToRgb(xy: Xy, brightness = 100) {
  // TODO: Fix not handling some colors well (e.g. 'Maroon' turns purple)
  // TODO: Replace with code from
  //  https://developers.meethue.com/develop/application-design-guidance/color-conversion-formulas-rgb-to-xy-and-back/

  //Set to maximum brightness if no custom value was given (Not the slick ECMAScript 6 way for compatibility reasons)
  if (brightness === undefined) {
    brightness = 254;
  }

  const z: number = 1.0 - xy.x - xy.y;
  const Y: number = parseFloat((brightness / 254).toFixed(2));
  const X: number = (Y / xy.y) * xy.x;
  const Z: number = (Y / xy.y) * z;

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

  return {
    r: Math.floor(red),
    g: Math.floor(green),
    b: Math.floor(blue)
  };
}

export function cieToRgbString(xy: Xy, brightness = 100) {
  const rgb = cieToRgb(xy, brightness);
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function cieToRgbHexString(xy: Xy, brightness = 100) {
  const rgb = cieToRgb(xy, brightness);
  return `#${rgb.r.toString(16).padStart(2, "0")}${rgb.g.toString(16).padStart(2, "0")}${rgb.b.toString(16).padStart(2, "0")}`;
}

/**
 * Converts a CT to an RGB string
 * @param {number} mireds Philips Hue CT value
 * @param {number} brightness Brightness of the light (1-254)
 * @returns {string} RGB string
 */
export function ctToRgb(mireds: number, brightness = 100): string {
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
 * @returns {Xy}
 */
export function rgbToCie(red: number, green: number, blue: number): Xy {
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

  return { x, y };
}

export function hexStringToHexNumber(hex: string): number {
  return parseInt(hex.slice(1) + "FF", 16);
}

export function createGradientUri(colors: string[], width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const scale = chroma
      .scale(colors)
      .mode("oklab")
      .correctLightness()
      .colors(width, null);

    const matrix = [...Array(height)].map((_, index) => {
      const factor = (index / height) * 1.2;
      return scale.map((color) => chroma(color).darken(factor * factor)
      );
    });

    new Jimp(width, height, (err, image) => {
      if (err) reject(err);

      const chromaColors = scale.map(color => chroma(color));

      image.scan(0, 0, width, height, (x, y, idx) => {
        const factor = (y / height) * 1.2;
        const color = chromaColors[x].darken(factor * factor);
        image.setPixelColor(hexStringToHexNumber(color.hex()), x, y);
      });

      image.getBase64(Jimp.MIME_PNG, (err, base64) => {
        if (err) reject(err);
        resolve(base64);
      });
    });
  });
}