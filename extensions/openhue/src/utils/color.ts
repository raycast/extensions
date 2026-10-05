import { GamutPosition } from "../api/types";

// Default gamut C (most modern Hue bulbs)
const DEFAULT_GAMUT = {
  red: { x: 0.6915, y: 0.3083 },
  green: { x: 0.17, y: 0.7 },
  blue: { x: 0.1532, y: 0.0475 },
};

/**
 * Convert hex color string to CIE XY color space
 * Based on Philips Hue color conversion algorithm
 */
export function hexToXY(hex: string): GamutPosition {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, "");

  // Parse RGB values
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  // Apply gamma correction
  const red = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  const green = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  const blue = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Convert to XYZ using Wide RGB D65 matrix
  const X = red * 0.664511 + green * 0.154324 + blue * 0.162028;
  const Y = red * 0.283881 + green * 0.668433 + blue * 0.047685;
  const Z = red * 0.000088 + green * 0.07231 + blue * 0.986039;

  // Calculate xy from XYZ
  const sum = X + Y + Z;
  if (sum === 0) {
    return { x: 0, y: 0 };
  }

  let x = X / sum;
  let y = Y / sum;

  // Clamp to gamut
  const point = clampToGamut({ x, y }, DEFAULT_GAMUT);
  x = point.x;
  y = point.y;

  return { x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 };
}

/**
 * Convert CIE XY color space to hex color string
 * This is an approximation as XY to RGB is lossy
 */
export function xyToHex(x: number, y: number, brightness: number = 100): string {
  // Calculate XYZ
  const z = 1 - x - y;
  const Y = brightness / 100;
  const X = (Y / y) * x;
  const Z = (Y / y) * z;

  // Convert to RGB using Wide RGB D65 matrix inverse
  let r = X * 1.656492 - Y * 0.354851 - Z * 0.255038;
  let g = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
  let b = X * 0.051713 - Y * 0.121364 + Z * 1.01153;

  // Clamp negative values
  r = Math.max(0, r);
  g = Math.max(0, g);
  b = Math.max(0, b);

  // Find max component for normalization
  const maxComponent = Math.max(r, g, b);
  if (maxComponent > 1) {
    r /= maxComponent;
    g /= maxComponent;
    b /= maxComponent;
  }

  // Apply reverse gamma correction
  r = r <= 0.0031308 ? 12.92 * r : 1.055 * Math.pow(r, 1 / 2.4) - 0.055;
  g = g <= 0.0031308 ? 12.92 * g : 1.055 * Math.pow(g, 1 / 2.4) - 0.055;
  b = b <= 0.0031308 ? 12.92 * b : 1.055 * Math.pow(b, 1 / 2.4) - 0.055;

  // Convert to hex
  const toHex = (value: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(value * 255)));
    return clamped.toString(16).padStart(2, "0");
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert color temperature (mirek) to approximate hex color
 */
export function mirekToHex(mirek: number): string {
  // Convert mirek to Kelvin (mirek = 1,000,000 / Kelvin)
  const kelvin = 1000000 / mirek;

  // Calculate RGB from color temperature
  let r: number, g: number, b: number;

  if (kelvin <= 6600) {
    r = 255;
    g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(kelvin / 100) - 161.1195681661));
    b = kelvin <= 1900 ? 0 : Math.min(255, Math.max(0, 138.5177312231 * Math.log(kelvin / 100 - 10) - 305.0447927307));
  } else {
    r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(kelvin / 100 - 60, -0.1332047592)));
    g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(kelvin / 100 - 60, -0.0755148492)));
    b = 255;
  }

  const toHex = (value: number) => Math.round(value).toString(16).padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Helper function to check if a point is inside a triangle (gamut)
function isPointInGamut(
  point: GamutPosition,
  gamut: { red: GamutPosition; green: GamutPosition; blue: GamutPosition },
): boolean {
  const { red, green, blue } = gamut;

  const v0x = blue.x - red.x;
  const v0y = blue.y - red.y;
  const v1x = green.x - red.x;
  const v1y = green.y - red.y;
  const v2x = point.x - red.x;
  const v2y = point.y - red.y;

  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;

  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

  return u >= 0 && v >= 0 && u + v <= 1;
}

// Helper to find closest point on a line segment
function closestPointOnLine(point: GamutPosition, lineStart: GamutPosition, lineEnd: GamutPosition): GamutPosition {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  if (dx === 0 && dy === 0) {
    return lineStart;
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy)),
  );

  return {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy,
  };
}

// Clamp point to gamut triangle
function clampToGamut(
  point: GamutPosition,
  gamut: { red: GamutPosition; green: GamutPosition; blue: GamutPosition },
): GamutPosition {
  if (isPointInGamut(point, gamut)) {
    return point;
  }

  // Find closest point on each edge
  const closestRG = closestPointOnLine(point, gamut.red, gamut.green);
  const closestGB = closestPointOnLine(point, gamut.green, gamut.blue);
  const closestBR = closestPointOnLine(point, gamut.blue, gamut.red);

  // Calculate distances
  const distRG = Math.pow(point.x - closestRG.x, 2) + Math.pow(point.y - closestRG.y, 2);
  const distGB = Math.pow(point.x - closestGB.x, 2) + Math.pow(point.y - closestGB.y, 2);
  const distBR = Math.pow(point.x - closestBR.x, 2) + Math.pow(point.y - closestBR.y, 2);

  // Return closest point
  const minDist = Math.min(distRG, distGB, distBR);
  if (minDist === distRG) return closestRG;
  if (minDist === distGB) return closestGB;
  return closestBR;
}

// Predefined colors for quick selection
export const PRESET_COLORS = [
  { name: "Red", hex: "#FF0000" },
  { name: "Orange", hex: "#FF8000" },
  { name: "Yellow", hex: "#FFFF00" },
  { name: "Green", hex: "#00FF00" },
  { name: "Cyan", hex: "#00FFFF" },
  { name: "Blue", hex: "#0000FF" },
  { name: "Purple", hex: "#8000FF" },
  { name: "Pink", hex: "#FF00FF" },
  { name: "White", hex: "#FFFFFF" },
] as const;

// Predefined color temperatures
export const PRESET_TEMPERATURES = [
  { name: "Cool Daylight", mirek: 153 },
  { name: "Daylight", mirek: 200 },
  { name: "Neutral", mirek: 300 },
  { name: "Warm White", mirek: 400 },
  { name: "Candlelight", mirek: 500 },
] as const;
