// Canned hero previews used by the onboarding theme picker. Pure module.

import { glyphFor, labelFor } from "./palettes";
import { HeroChartPoint, renderHero, svgToMarkdown } from "./svg";
import { ThemeId, styleFor } from "./themes";

export interface ThemeInfo {
  id: ThemeId;
  title: string;
  description: string;
}

export const THEME_INFO: ThemeInfo[] = [
  { id: "atmosphere", title: "Atmosphere", description: "Vivid skies that follow the weather" },
  { id: "synthwave", title: "Synthwave", description: "Retro neon nights" },
  { id: "noir", title: "Noir", description: "Moody monochrome" },
  { id: "paper", title: "Paper", description: "Warm light, ink on cream" },
  { id: "golden", title: "Golden Hour", description: "Perpetual sunset warmth" },
  { id: "terminal", title: "Terminal", description: "Green phosphor CRT" },
  { id: "blueprint", title: "Blueprint", description: "White line-work on cyanotype blue" },
  { id: "candy", title: "Candy", description: "Bubblegum pastel pop" },
];

const SAMPLE_CHART: HeroChartPoint[] = Array.from({ length: 24 }, (_, i) => ({
  label: i === 0 ? "Now" : `${(14 + i) % 24}h`,
  temp: 17 + 6 * Math.sin(((i + 20) / 24) * Math.PI * 2) + Math.sin(i * 1.7) * 0.7,
}));

/** Day + night sample renders for a theme, personalized with the user's place. */
export function themePreviewMarkdown(theme: ThemeId, place: string): string {
  const day = renderHero({
    place,
    dateLine: "A partly cloudy afternoon",
    temperature: 21.6,
    subline: "Feels like 21°  ·  H 24°  L 14°",
    conditionLabel: labelFor(2),
    unitSymbol: "C",
    glyph: glyphFor(2, true),
    style: styleFor(theme, 2, true),
    chart: SAMPLE_CHART,
    nowIndex: 0,
  });
  const night = renderHero({
    place,
    dateLine: "A clear night",
    temperature: 15.2,
    subline: "Feels like 14°  ·  H 24°  L 12°",
    conditionLabel: labelFor(0),
    unitSymbol: "C",
    glyph: glyphFor(0, false),
    style: styleFor(theme, 0, false),
    chart: SAMPLE_CHART,
    nowIndex: 12,
  });
  return `${svgToMarkdown(day, "Day preview")}\n\n${svgToMarkdown(night, "Night preview")}`;
}
