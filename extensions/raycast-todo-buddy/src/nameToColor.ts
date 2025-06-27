import * as crypto from "crypto";

function hexToHSL(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
    switch (max) {
      case r:
        h = (g - b) / diff + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / diff + 2;
        break;
      case b:
        h = (r - g) / diff + 4;
        break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const toRGB = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  h /= 360;
  s /= 100;
  l /= 100;

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(toRGB(p, q, h + 1 / 3) * 255);
  const g = Math.round(toRGB(p, q, h) * 255);
  const b = Math.round(toRGB(p, q, h - 1 / 3) * 255);

  return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function nameToColor(name: string): string {
  // Create a hash object
  const hash = crypto.createHash("md5");

  // Hash the user's name (input as a string)
  hash.update(name);

  // Get the hexadecimal digest of the hash
  const hexDigest = hash.digest("hex");

  // Convert the first 6 characters of the hash digest into a color
  const hexColor = hexDigest.slice(0, 6);

  // Convert the hex color to HSL
  const [h, s, l] = hexToHSL(hexColor);

  // Adjust the lightness to ensure a brighter color
  const minLightness = 200; // You can adjust this value to control the minimum lightness
  const adjustedL = Math.max(l, minLightness);

  // Convert the adjusted HSL color back to hex
  const brightHexColor = hslToHex(h, s, adjustedL);

  return `#${brightHexColor}`;
}
