import type { Appearance } from "./types.ts";

export type Theme = {
  name: Appearance;
  font: string;
  surface: string;
  border: string;
  ink: string;
  ink2: string;
  muted: string;
  track: string;
  accent: string;
  goodText: string;
  heat: string[];
  league: string[];
  onDark: string;
};

const FONT = "system-ui, -apple-system, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif";

export const light: Theme = {
  name: "light",
  font: FONT,
  surface: "#ffffff",
  border: "#e2e2e2",
  ink: "#0b0b0b",
  ink2: "#52514e",
  muted: "#898781",
  track: "#ededea",
  accent: "#0b0b0b",
  goodText: "#006300",
  heat: ["#ededea", "#dcdcd8", "#b8b8b4", "#7c7c78", "#0b0b0b"],
  league: ["#d4672a", "#7f8c9d", "#f2b800", "#1e9bf0"],
  onDark: "#0b0b0b",
};

export const dark: Theme = {
  name: "dark",
  font: FONT,
  surface: "#262629",
  border: "#343438",
  ink: "#ffffff",
  ink2: "#c3c2b7",
  muted: "#8e8d87",
  track: "#323236",
  accent: "#ffffff",
  goodText: "#0ca30c",
  heat: ["#2f2f33", "#4a4a52", "#73737e", "#a9a9b4", "#f2f2f5"],
  league: ["#e8763a", "#a9b5c5", "#ffd21f", "#42c4ff"],
  onDark: "#111111",
};

export type Tier = { name: string; min: number; glyph: string };

export function tiersFor(leagues: [number, number, number]): Tier[] {
  return [
    { name: "Bronze", min: 0, glyph: "🥉" },
    { name: "Silver", min: leagues[0], glyph: "🥈" },
    { name: "Gold", min: leagues[1], glyph: "🥇" },
    { name: "Diamond", min: leagues[2], glyph: "💎" },
  ];
}

export function tierFor(weeklyMinutes: number, tiers: Tier[]): { tier: Tier; next: Tier | null; index: number } {
  let index = 0;
  tiers.forEach((t, i) => {
    if (weeklyMinutes >= t.min) index = i;
  });
  return { tier: tiers[index], next: tiers[index + 1] ?? null, index };
}

export function themeFor(appearance: Appearance): Theme {
  return appearance === "dark" ? dark : light;
}

export type PosterPalette = {
  surface: string;
  ink: string;
  ink2: string;
  invertedTile: string;
  onInverted: string;
  onInvertedMuted: string;
  barTrack: string;
};

export function posterPalette(theme: Theme): PosterPalette {
  return theme.name === "dark"
    ? {
        surface: theme.heat[0],
        ink: "#ffffff",
        ink2: "#a9a8a2",
        invertedTile: "#ffffff",
        onInverted: "#0b0b0b",
        onInvertedMuted: "#5a5a5a",
        barTrack: "#d9d9d9",
      }
    : {
        surface: "#ffffff",
        ink: "#0b0b0b",
        ink2: "#5f5e59",
        invertedTile: "#0b0b0b",
        onInverted: "#ffffff",
        onInvertedMuted: "#b8b8b8",
        barTrack: "#2a2a2a",
      };
}

export const SHARE_GRADIENT: [string, string] = ["#25262c", "#0a0a0f"];
