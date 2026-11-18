import { IconSettings } from "./settings";

export type Appearance = "light" | "dark";

function channels(hex: string): number[] {
  const value = hex.slice(1);
  const expanded = value.length === 3 ? [...value].map((char) => char + char).join("") : value;
  return [0, 2, 4].map((offset) => parseInt(expanded.slice(offset, offset + 2), 16));
}

export function luminance(hex: string): number {
  const rgb = channels(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

function backgroundColor(hex: string, appearance: Appearance): string {
  const original = channels(hex);
  const target = appearance === "light" ? 255 : 0;
  for (let step = 0; step <= 100; step++) {
    const color = `#${original
      .map((channel) =>
        Math.round(channel + (target - channel) * (step / 100))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;
    const brightness = luminance(color);
    if (appearance === "light" ? brightness >= 0.65 : brightness <= 0.12) return color;
  }
  return appearance === "light" ? "#ffffff" : "#000000";
}

/** Keep the palette's hue and geometry, adjusting brightness only when the requested appearance needs it. */
export function applyAppearance(settings: IconSettings, appearance: Appearance): IconSettings {
  const start = backgroundColor(settings.backgroundStartColor, appearance);
  const end = backgroundColor(settings.backgroundEndColor, appearance);
  const backgrounds = settings.backgroundFillType === "Solid" ? [start] : [start, end];
  const glyph = luminance(settings.iconColor);
  const readable = backgrounds.every((color) => {
    const background = luminance(color);
    return (Math.max(glyph, background) + 0.05) / (Math.min(glyph, background) + 0.05) >= 4.5;
  });
  return {
    ...settings,
    backgroundStartColor: start,
    backgroundEndColor: end,
    iconColor: readable ? settings.iconColor : appearance === "light" ? "#111111" : "#ffffff",
    selectedPresetIndex: null,
  };
}
