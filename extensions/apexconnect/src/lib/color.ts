import { Color } from "@raycast/api";

export class RGB {
  r = 0;
  g = 0;
  b = 0;
}

export function miredToK(mired: number): number {
  return 1e6 / mired;
}

export function KToRGB(temp: number): RGB {
  // Original implementation by Tanner Helland http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/
  const result: RGB = { r: 0, g: 0, b: 0 };
  temp = temp / 100;
  let red = 0,
    blue = 0,
    green = 0;

  if (temp <= 66) {
    red = 255;
  } else {
    red = temp - 60;
    red = 329.698727466 * Math.pow(red, -0.1332047592);
    if (red < 0) {
      red = 0;
    }
    if (red > 255) {
      red = 255;
    }
  }

  if (temp <= 66) {
    green = temp;
    green = 99.4708025861 * Math.log(green) - 161.1195681661;
    if (green < 0) {
      green = 0;
    }
    if (green > 255) {
      green = 255;
    }
  } else {
    green = temp - 60;
    green = 288.1221695283 * Math.pow(green, -0.0755148492);
    if (green < 0) {
      green = 0;
    }
    if (green > 255) {
      green = 255;
    }
  }

  if (temp >= 66) {
    blue = 255;
  } else {
    if (temp <= 19) {
      blue = 0;
    } else {
      blue = temp - 10;
      blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
      if (blue < 0) {
        blue = 0;
      }
      if (blue > 255) {
        blue = 255;
      }
    }
  }
  result.r = Math.floor(red);
  result.g = Math.floor(green);
  result.b = Math.floor(blue);
  return result;
}

export function KtoColorLike(K: number): Color.ColorLike {
  const rgb = KToRGB(K);
  return RGBtoColorLike(rgb);
}

export function RGBtoColorLike(rgb: RGB): Color.ColorLike {
  return RGBtoString(rgb);
}

export function RGBtoString(rgb: RGB): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function changeRGBBrightness(rgb: RGB, percentage: number): RGB {
  const factor = percentage / 100;
  return {
    r: Math.min(255, Math.round(rgb.r * factor)),
    g: Math.min(255, Math.round(rgb.g * factor)),
    b: Math.min(255, Math.round(rgb.b * factor)),
  };
}
