import { SWITCHES_BY_NAME } from "./constants";
import type { SwitchName } from "./types";

export function tintForSwitch(name: SwitchName): string {
  return SWITCHES_BY_NAME[name]?.tint ?? "#737373";
}

export function iconForSwitch(name: SwitchName): string | undefined {
  return SWITCHES_BY_NAME[name]?.icon;
}

// Theme-aware chip tint: pale tints (Cream, Milky Yellow) vanish on a light list
// background; dark tints (Japanese Black) vanish on a dark one. Brighten for dark
// mode, darken for light mode — same hue, just enough contrast either way.
export function tagTintForSwitch(name: SwitchName): { light: string; dark: string } {
  const base = tintForSwitch(name);
  return { light: darken(base, 0.55), dark: brighten(base, 0.6) };
}

function brighten(hex: string, minBrightness: number): string {
  const [r, g, b] = parseHex(hex);
  const brightness = perceivedBrightness(r, g, b);
  if (brightness >= minBrightness) return hex;
  const t = (minBrightness - brightness) / (1 - brightness);
  return formatHex(...mix([r, g, b], 255, t));
}

function darken(hex: string, maxBrightness: number): string {
  const [r, g, b] = parseHex(hex);
  const brightness = perceivedBrightness(r, g, b);
  if (brightness <= maxBrightness) return hex;
  const t = (brightness - maxBrightness) / brightness;
  return formatHex(...mix([r, g, b], 0, t));
}

function parseHex(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function formatHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function perceivedBrightness(r: number, g: number, b: number): number {
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

function mix(rgb: [number, number, number], target: number, t: number): [number, number, number] {
  return rgb.map((c) => Math.round(c + (target - c) * t)) as [number, number, number];
}
